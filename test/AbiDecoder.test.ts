import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { AbiCoder, ZeroHash } from "ethers";
import hre from "hardhat";

import { AbiType } from "../src/typed-data/types";

const YesRemoveOffset = true;

const defaultAbiCoder = AbiCoder.defaultAbiCoder();

const AddressA = "0x0000000000000000000000000000000000000af1";

describe("Decoder library", async () => {
  async function setup() {
    const TestEncoder = await hre.ethers.getContractFactory("TestEncoder");
    const testEncoder = await TestEncoder.deploy();

    const MockDecoder = await hre.ethers.getContractFactory("AbiDecoderMock");
    const decoder = await MockDecoder.deploy();

    return {
      testEncoder,
      decoder,
    };
  }

  describe("top level - AbiEncodedWithSelector", () => {
    it("Static", async () => {
      const { decoder, testEncoder } = await loadFixture(setup);

      const { data } = await testEncoder.simple.populateTransaction(123);

      const layout = [
        {
          _type: AbiType.AbiEncodedWithSelector,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      const payload = await decoder.inspect(data as string, layout, 0);
      expect(payload._type).to.equal(AbiType.AbiEncodedWithSelector);

      const v = payload.children[0];
      expect(v._type).to.equal(AbiType.Static);
      expect(await decoder.pluck(data as string, v.location, v.size)).to.equal(
        encode("uint256", 123),
      );

      // expect(
      //   await decoder.pluck(data as string, tuple.location, tuple.size),
      // ).to.equal(
      //   defaultAbiCoder.encode(["tuple(uint256,address)"], [[999, AddressOne]]),
      // );
      // expect(
      //   await decoder.pluck(
      //     data as string,
      //     tupleField1.location,
      //     tupleField1.size,
      //   ),
      // ).to.equal(defaultAbiCoder.encode(["uint256"], [999]));
      // expect(
      //   await decoder.pluck(
      //     data as string,
      //     tupleField2.location,
      //     tupleField2.size,
      //   ),
      // ).to.equal(defaultAbiCoder.encode(["address"], [AddressOne]));
    });

    it("Dynamic", async () => {
      const { decoder, testEncoder } = await loadFixture(setup);

      const { data } =
        await testEncoder.dynamic.populateTransaction("0xaabbcc1122");

      const layout = [
        {
          _type: AbiType.AbiEncodedWithSelector,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          _type: AbiType.Dynamic,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      const payload = await decoder.inspect(data as string, layout, 0);
      expect(payload._type).to.equal(AbiType.AbiEncodedWithSelector);

      const v = payload.children[0];
      expect(v._type).to.equal(AbiType.Dynamic);
      expect(await decoder.pluck(data as string, v.location, v.size)).to.equal(
        encode("bytes", "0xaabbcc1122", true),
      );
    });

    it("AbiEncoded dynamic content", async () => {
      const { decoder, testEncoder } = await loadFixture(setup);

      const inner = AbiCoder.defaultAbiCoder().encode(
        ["bytes[]"],
        [["0xbadbef", "0xbadbadbadbad"]],
      );

      const { data } = await testEncoder.dynamic.populateTransaction(inner);

      const layout = [
        {
          _type: AbiType.AbiEncodedWithSelector,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [2],
        },
        {
          // 2
          _type: AbiType.Array,
          typeHash: ZeroHash,
          fields: [3],
        },
        {
          // 3
          _type: AbiType.Dynamic,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      // 0xd543852a -> selector
      // 0000000000000000000000000000000000000000000000000000000000000020 -> first param is dynamic so starts at offset 0x20
      // 0000000000000000000000000000000000000000000000000000000000000100 -> this is the lenth of the dynamic param
      // 0000000000000000000000000000000000000000000000000000000000000020 -> start of the dynamic param, that since its an abi encoded also has an offset
      // 0000000000000000000000000000000000000000000000000000000000000002 -> since its an array has lenght encoding
      // 0000000000000000000000000000000000000000000000000000000000000040
      // 0000000000000000000000000000000000000000000000000000000000000080
      // 0000000000000000000000000000000000000000000000000000000000000003
      // badbef0000000000000000000000000000000000000000000000000000000000
      // 0000000000000000000000000000000000000000000000000000000000000006
      // badbadbadbad0000000000000000000000000000000000000000000000000000

      const payload = await decoder.inspect(data as string, layout, 0);
      expect(payload._type).to.equal(AbiType.AbiEncodedWithSelector);

      const [abiEncoded] = payload.children;
      const [array] = abiEncoded.children;

      expect(
        await decoder.pluck(data as string, array.location, array.size),
      ).to.equal(
        encode(["bytes[]"], [["0xbadbef", "0xbadbadbadbad"]], YesRemoveOffset),
      );

      // expect(
      //   await decoder.pluck(data as string, _array.location, _array.size),
      // ).to.equal(encode(["bytes[]"], [["0xbadbee1", "0xbadbadbad"]]));

      // expect(
      //   await decoder.pluck(data as string, tuple.location, tuple.size),
      // ).to.equal(
      //   encode(
      //     ["tuple(bytes)"],
      //     [[AbiCoder.defaultAbiCoder().encode(["uint256"], [98765])]],
      //     YesRemoveOffset,
      //   ),
      // );
    });

    it("AbiEncoded dynamic content other", async () => {
      const { decoder, testEncoder } = await loadFixture(setup);

      const inner = AbiCoder.defaultAbiCoder().encode(
        ["bytes"],
        ["0xaabbccddeeff"],
      );

      const { data } = await testEncoder.dynamic.populateTransaction(inner);

      const layout = [
        {
          _type: AbiType.AbiEncodedWithSelector,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [2],
        },
        {
          // 2
          _type: AbiType.Dynamic,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      const payload = await decoder.inspect(data as string, layout, 0);
      expect(payload._type).to.equal(AbiType.AbiEncodedWithSelector);

      const [abiEncoded] = payload.children;
      const [dynamic] = abiEncoded.children;

      expect(
        await decoder.pluck(data as string, dynamic.location, dynamic.size),
      ).to.equal(encode(["bytes"], ["0xaabbccddeeff"], YesRemoveOffset));
    });

    it("AbiEncoded dynamic content mixed", async () => {
      const { decoder, testEncoder } = await loadFixture(setup);

      const inner = AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256, bytes)"],
        [[1234, "0xbadbad"]],
      );

      const { data } = await testEncoder.dynamic.populateTransaction(inner);

      const layout = [
        {
          _type: AbiType.AbiEncodedWithSelector,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [2],
        },
        {
          // 2
          _type: AbiType.Tuple,
          typeHash: ZeroHash,
          fields: [3, 4],
        },
        {
          // 3
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
        {
          // 4
          _type: AbiType.Dynamic,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      // 0xd543852a
      // 0000000000000000000000000000000000000000000000000000000000000020 -> first param is dynamic so starts at offset 0x20
      // 00000000000000000000000000000000000000000000000000000000000000a0 -> this is the lenth of the dynamic param
      // 0000000000000000000000000000000000000000000000000000000000000020
      // 00000000000000000000000000000000000000000000000000000000000004d2
      // 0000000000000000000000000000000000000000000000000000000000000040
      // 0000000000000000000000000000000000000000000000000000000000000003
      // badbad0000000000000000000000000000000000000000000000000000000000

      const payload = await decoder.inspect(data as string, layout, 0);
      expect(payload._type).to.equal(AbiType.AbiEncodedWithSelector);

      const [abiEncoded] = payload.children;
      const [tuple] = abiEncoded.children;
      const [_static, dynamic] = tuple.children;

      expect(
        await decoder.pluck(data as string, _static.location, _static.size),
      ).to.equal(encode(["uint256"], [1234]));
      expect(
        await decoder.pluck(data as string, dynamic.location, dynamic.size),
      ).to.equal(encode(["bytes"], ["0xbadbad"], YesRemoveOffset));
    });

    it("AbiEncoded static content", async () => {
      const { decoder, testEncoder } = await loadFixture(setup);

      const inner = AbiCoder.defaultAbiCoder().encode(["uint256"], [99887766]);

      const { data } = await testEncoder.dynamic.populateTransaction(inner);

      const layout = [
        {
          _type: AbiType.AbiEncodedWithSelector,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [2],
        },
        {
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      // 0xd543852a -> selector
      // 0000000000000000000000000000000000000000000000000000000000000020 -> first param is dynamic so starts at offset 0x20
      // 0000000000000000000000000000000000000000000000000000000000000100 -> this is the lenth of the dynamic param
      // 0000000000000000000000000000000000000000000000000000000000000020 -> start of the dynamic param, that since its an abi encoded also has an offset
      // 0000000000000000000000000000000000000000000000000000000000000002 -> since its an array has lenght encoding
      // 0000000000000000000000000000000000000000000000000000000000000040
      // 0000000000000000000000000000000000000000000000000000000000000080
      // 0000000000000000000000000000000000000000000000000000000000000003
      // badbef0000000000000000000000000000000000000000000000000000000000
      // 0000000000000000000000000000000000000000000000000000000000000006
      // badbadbadbad0000000000000000000000000000000000000000000000000000

      const payload = await decoder.inspect(data as string, layout, 0);
      expect(payload._type).to.equal(AbiType.AbiEncodedWithSelector);

      const [abiEncoded] = payload.children;
      const [_static] = abiEncoded.children;

      expect(
        await decoder.pluck(data as string, _static.location, _static.size),
      ).to.equal(encode(["uint256"], [99887766]));
    });

    describe("Tuple", () => {
      it("Static ", async () => {
        const { decoder, testEncoder } = await loadFixture(setup);

        const { data } = await testEncoder.staticTuple.populateTransaction(
          {
            a: AddressA,
          },
          987,
        );

        const layout = [
          {
            _type: AbiType.AbiEncodedWithSelector,
            typeHash: ZeroHash,
            fields: [1, 2],
          },
          {
            _type: AbiType.Tuple,
            typeHash: ZeroHash,
            fields: [2],
          },
          {
            _type: AbiType.Static,
            typeHash: ZeroHash,
            fields: [],
          },
        ];

        const payload = await decoder.inspect(data as string, layout, 0);
        expect(payload._type).to.equal(AbiType.AbiEncodedWithSelector);

        const [tuple, _static] = payload.children;
        const [innerStatic] = tuple.children;

        expect(
          await decoder.pluck(data as string, tuple.location, tuple.size),
        ).to.equal(encode(["tuple(address)"], [[AddressA]]));

        expect(
          await decoder.pluck(data as string, _static.location, _static.size),
        ).to.equal(encode("uint256", 987));

        expect(
          await decoder.pluck(
            data as string,
            innerStatic.location,
            innerStatic.size,
          ),
        ).to.equal(encode("address", AddressA));
      });

      it.skip("Dynamic", () => {});

      it.skip("Static tuple", () => {});

      it("Dynamic tuple", async () => {
        const { decoder, testEncoder } = await loadFixture(setup);

        const { data } = await testEncoder.dynamicTuple.populateTransaction({
          dynamic: "0xaabbcc",
          _static: 123,
          dynamic32: [456],
        });

        const layout = [
          {
            _type: AbiType.AbiEncodedWithSelector,
            typeHash: ZeroHash,
            fields: [1],
          },
          {
            _type: AbiType.Tuple,
            typeHash: ZeroHash,
            fields: [2, 3, 4],
          },
          {
            _type: AbiType.Dynamic,
            typeHash: ZeroHash,
            fields: [],
          },
          {
            _type: AbiType.Static,
            typeHash: ZeroHash,
            fields: [],
          },
          {
            _type: AbiType.Array,
            typeHash: ZeroHash,
            fields: [5],
          },
          {
            _type: AbiType.Static,
            typeHash: ZeroHash,
            fields: [],
          },
        ];

        const payload = await decoder.inspect(data as string, layout, 0);
        expect(payload._type).to.equal(AbiType.AbiEncodedWithSelector);

        const [tuple] = payload.children;

        const [dynamic, _static, dynamic32] = tuple.children;
        expect(
          await decoder.pluck(data as string, dynamic.location, dynamic.size),
        ).to.equal(encode("bytes", "0xaabbcc", YesRemoveOffset));

        expect(
          await decoder.pluck(data as string, _static.location, _static.size),
        ).to.equal(encode("uint256", "123"));

        expect(
          await decoder.pluck(
            data as string,
            dynamic32.location,
            dynamic32.size,
          ),
        ).to.equal(encode(["uint256[]"], [[456]], YesRemoveOffset));
      });

      it("AbiEncoded static content", async () => {
        const { decoder, testEncoder } = await loadFixture(setup);

        const inner = AbiCoder.defaultAbiCoder().encode(["uint256"], [98765]);

        const { data } = await testEncoder._dynamicTuple.populateTransaction({
          dynamic: inner,
        });

        const layout = [
          {
            _type: AbiType.AbiEncodedWithSelector,
            typeHash: ZeroHash,
            fields: [1],
          },
          {
            _type: AbiType.Tuple,
            typeHash: ZeroHash,
            fields: [2],
          },
          {
            _type: AbiType.AbiEncoded,
            typeHash: ZeroHash,
            fields: [3],
          },
          {
            _type: AbiType.Static,
            typeHash: ZeroHash,
            fields: [],
          },
        ];

        const payload = await decoder.inspect(data as string, layout, 0);
        expect(payload._type).to.equal(AbiType.AbiEncodedWithSelector);

        const [tuple] = payload.children;
        expect(
          await decoder.pluck(data as string, tuple.location, tuple.size),
        ).to.equal(
          encode(
            ["tuple(bytes)"],
            [[AbiCoder.defaultAbiCoder().encode(["uint256"], [98765])]],
            YesRemoveOffset,
          ),
        );

        const [abiEncoded] = tuple.children;
        const [_static] = abiEncoded.children;
        expect(
          await decoder.pluck(data as string, _static.location, _static.size),
        ).to.equal(AbiCoder.defaultAbiCoder().encode(["uint256"], [98765]));
      });

      it("AbiEncoded dynamic content", async () => {
        const { decoder, testEncoder } = await loadFixture(setup);

        const inner = AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256, bytes[])"],
          [[12345, ["0xbadbef", "0xbadbadbadbad"]]],
        );

        const { data } = await testEncoder._dynamicTuple.populateTransaction({
          dynamic: inner,
        });

        const layout = [
          {
            _type: AbiType.AbiEncodedWithSelector,
            typeHash: ZeroHash,
            fields: [1],
          },
          {
            _type: AbiType.Tuple,
            typeHash: ZeroHash,
            fields: [2],
          },
          {
            _type: AbiType.AbiEncoded,
            typeHash: ZeroHash,
            fields: [3],
          },
          {
            // 3
            _type: AbiType.Tuple,
            typeHash: ZeroHash,
            fields: [4, 5],
          },
          {
            // 4
            _type: AbiType.Static,
            typeHash: ZeroHash,
            fields: [],
          },
          {
            // 5
            _type: AbiType.Array,
            typeHash: ZeroHash,
            fields: [6],
          },
          {
            _type: AbiType.Dynamic,
            typeHash: ZeroHash,
            fields: [],
          },
        ];

        const payload = await decoder.inspect(data as string, layout, 0);
        expect(payload._type).to.equal(AbiType.AbiEncodedWithSelector);

        const [tuple] = payload.children;
        const [abiEncoded] = tuple.children;
        const [tuple2] = abiEncoded.children;
        const [_static, _array] = tuple2.children;

        expect(
          await decoder.pluck(data as string, _static.location, _static.size),
        ).to.equal(encode("uint256", 12345));

        expect(
          await decoder.pluck(data as string, _array.location, _array.size),
        ).to.equal(
          encode(
            ["bytes[]"],
            [["0xbadbef", "0xbadbadbadbad"]],
            YesRemoveOffset,
          ),
        );

        // expect(
        //   await decoder.pluck(data as string, _array.location, _array.size),
        // ).to.equal(encode(["bytes[]"], [["0xbadbee1", "0xbadbadbad"]]));

        // expect(
        //   await decoder.pluck(data as string, tuple.location, tuple.size),
        // ).to.equal(
        //   encode(
        //     ["tuple(bytes)"],
        //     [[AbiCoder.defaultAbiCoder().encode(["uint256"], [98765])]],
        //     YesRemoveOffset,
        //   ),
        // );
      });

      it.skip("Array dynamic");

      it.skip("Array dynamic - empty");

      it.skip("Array static");

      it.skip("Array static - empty");

      it.skip("Array fixed");
    });

    describe("Array", () => {
      it("static ", () => {});

      it("dynamic", () => {});

      it("static tuple", () => {});

      it("dynamic tuple", () => {});
    });
  });

  describe("entrypoint - AbiEncoded", () => {
    it("Static", async () => {
      const { decoder } = await loadFixture(setup);

      const data = AbiCoder.defaultAbiCoder().encode(["uint256"], [12345]);

      const layout = [
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      const _static = await decoder.inspect(data as string, layout, 0);
      expect(
        await decoder.pluck(data as string, _static.location, _static.size),
      ).to.equal(encode("uint256", 12345));
    });

    it("Dynamic", async () => {
      const { decoder } = await loadFixture(setup);

      const data = AbiCoder.defaultAbiCoder().encode(
        ["bytes"],
        ["0xaabbcc1122"],
      );

      const layout = [
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          _type: AbiType.Dynamic,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      const dynamic = await decoder.inspect(data as string, layout, 0);

      expect(
        await decoder.pluck(data as string, dynamic.location, dynamic.size),
      ).to.equal(encode("bytes", "0xaabbcc1122", YesRemoveOffset));
    });

    it("Tuple Static", async () => {
      const { decoder } = await loadFixture(setup);

      const data = AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256, bool)"],
        [[12345, true]],
      );

      const layout = [
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          _type: AbiType.Tuple,
          typeHash: ZeroHash,
          fields: [2, 3],
        },
        {
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
        {
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      const tuple = await decoder.inspect(data as string, layout, 0);
      const [s1, s2] = tuple.children;

      expect(
        await decoder.pluck(data as string, s1.location, s1.size),
      ).to.equal(encode("uint256", 12345));

      expect(
        await decoder.pluck(data as string, s2.location, s2.size),
      ).to.equal(encode("bool", true));
    });

    it("Tuple Dynamic", async () => {
      const { decoder } = await loadFixture(setup);

      const data = AbiCoder.defaultAbiCoder().encode(
        ["tuple(address,bytes,uint256)"],
        [[AddressA, "0xbadbadbadbad", 12345]],
      );

      const layout = [
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          _type: AbiType.Tuple,
          typeHash: ZeroHash,
          fields: [2, 3, 4],
        },
        {
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
        {
          _type: AbiType.Dynamic,
          typeHash: ZeroHash,
          fields: [],
        },
        {
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      const tuple = await decoder.inspect(data as string, layout, 0);

      const [s1, d1, s2] = tuple.children;

      expect(
        await decoder.pluck(data as string, s1.location, s1.size),
      ).to.equal(encode("address", AddressA));

      expect(
        await decoder.pluck(data as string, d1.location, d1.size),
      ).to.equal(encode("bytes", "0xbadbadbadbad", YesRemoveOffset));

      expect(
        await decoder.pluck(data as string, s2.location, s2.size),
      ).to.equal(encode("uint256", 12345));
    });

    it("Tuple With Nested Dynamic Tuple", async () => {
      const { decoder } = await loadFixture(setup);

      const data = AbiCoder.defaultAbiCoder().encode(
        ["tuple(address,tuple(uint256[]))"],
        [[AddressA, [[12345, 4567]]]],
      );

      const layout = [
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          // 1
          _type: AbiType.Tuple,
          typeHash: ZeroHash,
          fields: [2, 3],
        },
        {
          // 2
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
        {
          // 3
          _type: AbiType.Tuple,
          typeHash: ZeroHash,
          fields: [4],
        },
        {
          // 4
          _type: AbiType.Array,
          typeHash: ZeroHash,
          fields: [5],
        },
        {
          // 5
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      const tuple = await decoder.inspect(data as string, layout, 0);

      const [_static, _tuple] = tuple.children;
      const [array] = _tuple.children;

      expect(
        await decoder.pluck(data as string, _static.location, _static.size),
      ).to.equal(encode("address", AddressA));

      expect(
        await decoder.pluck(data as string, array.location, array.size),
      ).to.equal(encode(["uint256[]"], [[12345, 4567]], YesRemoveOffset));
    });

    it("Tuple With Nested Static Tuple", async () => {
      const { decoder } = await loadFixture(setup);

      const data = AbiCoder.defaultAbiCoder().encode(
        ["tuple(tuple(bool, bytes2),address)"],
        [[[false, "0x1234"], AddressA]],
      );

      const layout = [
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          // 1
          _type: AbiType.Tuple,
          typeHash: ZeroHash,
          fields: [2, 3],
        },
        {
          // 3
          _type: AbiType.Tuple,
          typeHash: ZeroHash,
          fields: [4, 5],
        },
        {
          // 2
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
        {
          // 4
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
        {
          // 5
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      const tuple = await decoder.inspect(data as string, layout, 0);

      const [_tuple, _static] = tuple.children;
      const [__s1, __s2] = _tuple.children;

      expect(
        await decoder.pluck(data as string, _static.location, _static.size),
      ).to.equal(encode("address", AddressA));

      expect(
        await decoder.pluck(data as string, __s1.location, __s1.size),
      ).to.equal(encode(["bool"], [false]));

      expect(
        await decoder.pluck(data as string, __s2.location, __s2.size),
      ).to.equal(encode(["bytes2"], ["0x1234"]));
    });

    it("Tuple With Nested Tuple Array", async () => {
      const { decoder } = await loadFixture(setup);

      const data = AbiCoder.defaultAbiCoder().encode(
        ["tuple(string, tuple(bool, bytes2)[])"],
        [
          [
            "John Doe",
            [
              [true, "0x1234"],
              [false, "0xabcd"],
            ],
          ],
        ],
      );

      const layout = [
        {
          _type: AbiType.AbiEncoded,
          typeHash: ZeroHash,
          fields: [1],
        },
        {
          // 1
          _type: AbiType.Tuple,
          typeHash: ZeroHash,
          fields: [2, 3],
        },
        {
          // 2
          _type: AbiType.Dynamic,
          typeHash: ZeroHash,
          fields: [],
        },
        {
          // 3
          _type: AbiType.Array,
          typeHash: ZeroHash,
          fields: [4],
        },
        {
          // 4
          _type: AbiType.Tuple,
          typeHash: ZeroHash,
          fields: [5, 6],
        },
        {
          // 5
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
        {
          // 6
          _type: AbiType.Static,
          typeHash: ZeroHash,
          fields: [],
        },
      ];

      const tuple = await decoder.inspect(data as string, layout, 0);

      const [dynamic, array] = tuple.children;
      const [_tuple] = array.children;
      const [_s1, _s2] = _tuple.children;

      expect(
        await decoder.pluck(data as string, dynamic.location, dynamic.size),
      ).to.equal(encode("string", "John Doe", YesRemoveOffset));

      expect(
        await decoder.pluck(data as string, array.location, array.size),
      ).to.equal(
        encode(
          "tuple(bool, bytes2)[]",
          [
            [
              [true, "0x1234"],
              [false, "0xabcd"],
            ],
          ],
          YesRemoveOffset,
        ),
      );

      expect(
        await decoder.pluck(data as string, _s1.location, _s1.size),
      ).to.equal(encode("bool", true));

      expect(
        await decoder.pluck(data as string, _s2.location, _s2.size),
      ).to.equal(encode("bytes2", "0x1234"));
    });

    it.skip("Array Static", () => {});

    it.skip("Array Static - empty", () => {});

    it.skip("Array Dynamic", () => {});

    it.skip("Array Dynamic - empty", () => {});

    it.skip("AbiEncodedWithSelector Static", () => {});

    it.skip("AbiEncodedWithSelector Dynamic", () => {});
  });

  it.skip("plucks Array from top level");
  it.skip("plucks Array from Tuple");
  it.skip("plucks Array from Array");
  it.skip("plucks Array from nested Calldata");
  it.skip("plucks Array from nested AbiEncoded");
});

function encode(types: any, values: any, removeOffset = false) {
  types = Array.isArray(types) ? types : [types];
  values = Array.isArray(values) ? values : [values];

  const result = defaultAbiCoder.encode(types, values);
  return removeOffset ? `0x${result.slice(66)}` : result;
}
