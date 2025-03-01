// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.17 <0.9.0;

struct Payload {
    TypeKey key;
    bytes32 hash;
    uint256 location;
    uint256 size;
    Payload[] children;
}

enum TypeKey {
    Atomic,
    Dynamic,
    Array,
    Struct,
    Hash
}

struct Type {
    TypeKey key;
    string structSignature;
    uint256[] elements;
}

import "hardhat/console.sol";

/**
 * @title Decoder - a library that discovers parameter locations in calldata
 * from a list of conditions.
 * @author Cristóvão Honorato - <cristovao.honorato@gnosis.io>
 */
library TypeValueDecoder {
    error CalldataOutOfBounds();

    /**
     * @dev Maps the location and size of parameters in the encoded transaction data.
     * @param data The encoded transaction data.
     * @return result The mapped location and size of parameters in the encoded transaction data.
     */
    function inspect(
        bytes calldata data,
        Type[] calldata types,
        uint256 startIndex
    ) internal pure returns (Payload memory result) {
        /*
         * In the parameter encoding area, there is a region called the head
         * that is divided into 32-byte chunks. Each parameter has its own
         * corresponding chunk in the head region:
         * - Static parameters are encoded inline.
         * - Dynamic parameters have an offset to the tail, which is the start
         *   of the actual encoding for the dynamic parameter. Note that the
         *   offset does not include the 4-byte function signature."
         *
         */
        __block__(
            data,
            _isInline(types, startIndex) ? 0 : 32,
            types,
            startIndex,
            types[startIndex].elements.length,
            false,
            result
        );
        result.hash = keccak256(
            abi.encodePacked(types[startIndex].structSignature)
        );
    }

    /**
     * @dev Walks through a parameter encoding tree and maps their location and
     * size within calldata.
     * @param data The encoded transaction data.
     * @param location The current offset within the calldata buffer.
     * @param types The current node being traversed within the parameter tree.
     * @param result The location and size of the parameter within calldata.
     */
    function _walk(
        bytes calldata data,
        uint256 location,
        Type[] calldata types,
        uint256 index,
        Payload memory result
    ) private pure {
        TypeKey key = types[index].key;

        if (key == TypeKey.Atomic || key == TypeKey.Hash) {
            result.size = 32;
        } else if (key == TypeKey.Dynamic) {
            result.size = 32 + _ceil32(uint256(word(data, location)));
        } else if (key == TypeKey.Struct) {
            __block__(
                data,
                location,
                types,
                index,
                types[index].elements.length,
                false,
                result
            );
            result.hash = keccak256(
                abi.encodePacked(types[index].structSignature)
            );
        } else if (key == TypeKey.Array) {
            __block__(
                data,
                location + 32,
                types,
                index,
                uint256(word(data, location)),
                true,
                result
            );
            result.size += 32;
        }

        result.key = key;
        result.location = location;
    }

    /**
     * @dev Recursively walk through the TypeTree to decode a block of parameters.
     * @param data The encoded transaction data.
     * @param location The current location of the parameter block being processed.
     * @param types The current TypeTree node being processed.
     * @param index The current Type being processed.
     * @param length The number of parts in the block.
     * @param template whether first child is type descriptor for all parts.
     * @param result The decoded Payload.
     */
    function __block__(
        bytes calldata data,
        uint256 location,
        Type[] calldata types,
        uint256 index,
        uint256 length,
        bool template,
        Payload memory result
    ) private pure {
        result.children = new Payload[](length);
        bool isInline;
        if (template) isInline = _isInline(types, index);

        uint256 offset;
        for (uint256 i; i < length; ) {
            if (!template)
                isInline = _isInline(types, types[index].elements[i]);

            _walk(
                data,
                _locationInBlock(data, location, offset, isInline),
                types,
                types[index].elements[template ? 0 : i],
                result.children[i]
            );

            uint256 childSize = result.children[i].size;
            result.size += isInline ? childSize : childSize + 32;
            offset += isInline ? childSize : 32;

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Returns the location of a block part, which may be located inline
     * within the block - at the HEAD - or at an offset relative to the start
     * of the block - at the TAIL.
     *
     * @param data The encoded transaction data.
     * @param location The location of the block within the calldata buffer.
     * @param offset The offset of the block part, relative to the start of the block.
     * @param isInline Whether the block part is located inline within the block.
     *
     * @return The location of the block part within the calldata buffer.
     */
    function _locationInBlock(
        bytes calldata data,
        uint256 location,
        uint256 offset,
        bool isInline
    ) private pure returns (uint256) {
        uint256 headLocation = location + offset;
        if (isInline) {
            return headLocation;
        } else {
            return location + uint256(word(data, headLocation));
        }
    }

    /**
     * @dev Plucks a slice of bytes from calldata.
     * @param data The calldata to pluck the slice from.
     * @param location The starting location of the slice.
     * @param size The size of the slice.
     * @return A slice of bytes from calldata.
     */
    function pluck(
        bytes calldata data,
        uint256 location,
        uint256 size
    ) internal pure returns (bytes calldata) {
        return data[location:location + size];
    }

    /**
     * @dev Loads a word from calldata.
     * @param data The calldata to load the word from.
     * @param location The starting location of the slice.
     * @return result 32 byte word from calldata.
     */
    function word(
        bytes calldata data,
        uint256 location
    ) internal pure returns (bytes32 result) {
        if (location + 32 > data.length) {
            revert CalldataOutOfBounds();
        }
        assembly {
            result := calldataload(add(data.offset, location))
        }
    }

    function _ceil32(uint256 size) private pure returns (uint256) {
        // pad size. Source: http://www.cs.nott.ac.uk/~psarb2/G51MPC/slides/NumberLogic.pdf
        return ((size + 32 - 1) / 32) * 32;
    }

    function _isInline(
        Type[] calldata types,
        uint256 index
    ) internal pure returns (bool) {
        TypeKey key = types[index].key;
        if (key == TypeKey.Atomic || key == TypeKey.Hash) {
            return true;
        } else if (key == TypeKey.Dynamic || key == TypeKey.Array) {
            return false;
        } else {
            uint256 length = types[index].elements.length;

            for (uint256 i; i < length; ) {
                if (!_isInline(types, types[index].elements[i])) {
                    return false;
                }
                unchecked {
                    ++i;
                }
            }
            return true;
        }
    }
}
