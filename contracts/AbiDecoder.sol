// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.17 <0.9.0;

enum AbiType {
    Static,
    Dynamic,
    Array,
    Tuple
}

struct AbiParam {
    AbiType _type;
    bytes32 typeHash;
    uint256[] fields;
}

struct AbiPayload {
    AbiType _type;
    bytes32 typeHash;
    uint256 location;
    uint256 size;
    AbiPayload[] children;
}

struct AbiEncoded {
    bytes data;
    AbiParam[] params;
}

library AbiDecoder {
    error CalldataOutOfBounds();

    /**
     * @dev Maps the location and size of each abo part in the encoded data.
     * @param encoded The abi encoded data and params.
     * @return result The mapped location and size of parameters in the encoded transaction data.
     */
    function inspect(
        AbiEncoded calldata encoded
    ) internal pure returns (AbiPayload memory result) {
        /*
         * In the parameter encoding area, there is a region called the head
         * that is divided into 32-byte chunks. Each parameter has its own
         * corresponding chunk in the head region:
         * - Static parameters are encoded inline.
         * - Dynamic parameters have an offset to the tail, which is the start
         *   of the actual encoding for the dynamic parameter. Note that the
         *   offset is relative to the start of the block"
         *
         */
        __block__(
            encoded.data,
            _isInline(encoded.params, 0) ? 0 : 32,
            encoded.params,
            0,
            encoded.params[0].fields.length,
            false,
            result
        );
        result.typeHash = encoded.params[0].typeHash;
    }

    /**
     * @dev Walks through a parameter encoding tree and maps their location and
     * size within calldata.
     * @param data The encoded transaction data.
     * @param location The current offset within the calldata buffer.
     * @param params The current node being traversed within the parameter tree.
     * @param result The location and size of the parameter within calldata.
     */
    function _walk(
        bytes calldata data,
        uint256 location,
        AbiParam[] calldata params,
        uint256 paramIndex,
        AbiPayload memory result
    ) private pure {
        AbiType _type = params[paramIndex]._type;

        if (_type == AbiType.Static) {
            result.size = 32;
        } else if (_type == AbiType.Dynamic) {
            result.size = 32 + _ceil32(uint256(word(data, location)));
        } else if (_type == AbiType.Tuple) {
            __block__(
                data,
                location,
                params,
                paramIndex,
                params[paramIndex].fields.length,
                false,
                result
            );
            result.typeHash = params[paramIndex].typeHash;
        } else {
            // Array
            __block__(
                data,
                location + 32,
                params,
                paramIndex,
                uint256(word(data, location)),
                true,
                result
            );
            result.size += 32;
        }

        result._type = _type;
        result.location = location;
    }

    /**
     * @dev Recursively walk through the TypeTree to decode a block of parameters.
     * @param data The encoded transaction data.
     * @param location The current location of the parameter block being processed.
     * @param params The current TypeTree node being processed.
     * @param paramIndex The current Type being processed.
     * @param blockLength The number of parts in the block.
     * @param template whether first child is type descriptor for all parts.
     * @param result The decoded Payload.
     */
    function __block__(
        bytes calldata data,
        uint256 location,
        AbiParam[] calldata params,
        uint256 paramIndex,
        uint256 blockLength,
        bool template,
        AbiPayload memory result
    ) private pure {
        result.children = new AbiPayload[](blockLength);
        bool isInline;
        if (template)
            isInline = _isInline(params, params[paramIndex].fields[0]);

        uint256 offset;
        for (uint256 i; i < blockLength; ) {
            if (!template)
                isInline = _isInline(params, params[paramIndex].fields[i]);

            _walk(
                data,
                _locationInBlock(data, location, offset, isInline),
                params,
                params[paramIndex].fields[template ? 0 : i],
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
        AbiParam[] calldata params,
        uint256 index
    ) internal pure returns (bool) {
        AbiParam calldata param = params[index];

        if (param._type == AbiType.Static) {
            return true;
        } else if (
            param._type == AbiType.Dynamic || param._type == AbiType.Array
        ) {
            return false;
        } else {
            uint256 length = param.fields.length;

            for (uint256 i; i < length; ++i) {
                if (!_isInline(params, param.fields[i])) {
                    return false;
                }
            }
            return true;
        }
    }
}
