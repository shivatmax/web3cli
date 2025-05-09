To thoroughly test the `SimpleERC721WithRoyalties` contract, we'll create a comprehensive Hardhat test suite using JavaScript and Ethers.js. This suite will cover all major functionalities, positive and negative test cases, edge cases, and potential security issues.

Here's a suggested test suite:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleERC721WithRoyalties", function () {
    let SimpleERC721WithRoyalties;
    let simpleERC721;
    let owner, addr1, addr2;

    const name = "MyNFT";
    const symbol = "MNFT";
    const initialRecipient = "0x1234567890123456789012345678901234567890";
    const initialFeeNumerator = 500; // 5%

    before(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        SimpleERC721WithRoyalties = await ethers.getContractFactory("SimpleERC721WithRoyalties");
    });

    beforeEach(async function () {
        simpleERC721 = await SimpleERC721WithRoyalties.deploy(name, symbol, initialRecipient, initialFeeNumerator);
        await simpleERC721.deployed();
    });

    describe("Deployment", function () {
        it("should set the correct initial values", async function () {
            expect(await simpleERC721.name()).to.equal(name);
            expect(await simpleERC721.symbol()).to.equal(symbol);
        });

        it("should set the correct initial royalty", async function () {
            const royaltyInfo = await simpleERC721.royaltyInfo(1, 10000);
            expect(royaltyInfo[0]).to.equal(initialRecipient);
            expect(royaltyInfo[1]).to.equal(500); // 5% of 10000
        });
    });

    describe("Minting", function () {
        it("should allow the owner to mint a new token", async function () {
            await expect(simpleERC721.connect(owner).mint(addr1.address, "uri1"))
                .to.emit(simpleERC721, "TokenMinted")
                .withArgs(addr1.address, 0);

            expect(await simpleERC721.ownerOf(0)).to.equal(addr1.address);
            expect(await simpleERC721.tokenURI(0)).to.equal("uri1");
        });

        it("should not allow non-owner to mint", async function () {
            await expect(simpleERC721.connect(addr1).mint(addr1.address, "uri1"))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should not allow minting beyond max supply", async function () {
            for (let i = 0; i < 10000; i++) {
                await simpleERC721.connect(owner).mint(addr1.address, `uri${i}`);
            }
            await expect(simpleERC721.connect(owner).mint(addr1.address, "uri10001"))
                .to.be.revertedWith("Max supply reached");
        });
    });

    describe("Royalty management", function () {
        it("should allow owner to update royalties", async function () {
            await expect(simpleERC721.connect(owner).setRoyaltyInfo(addr1.address, 1000))
                .to.emit(simpleERC721, "RoyaltyInfoUpdated")
                .withArgs(addr1.address, 1000);

            const royaltyInfo = await simpleERC721.royaltyInfo(1, 10000);
            expect(royaltyInfo[0]).to.equal(addr1.address);
            expect(royaltyInfo[1]).to.equal(1000); // 10% of 10000
        });

        it("should not allow non-owner to update royalties", async function () {
            await expect(simpleERC721.connect(addr1).setRoyaltyInfo(addr1.address, 1000))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should revert if royalty fee is too high", async function () {
            await expect(simpleERC721.connect(owner).setRoyaltyInfo(addr1.address, 10001))
                .to.be.revertedWith("Royalty too high");
        });

        it("should revert if royalty recipient is the zero address", async function () {
            await expect(simpleERC721.connect(owner).setRoyaltyInfo(ethers.constants.AddressZero, 500))
                .to.be.revertedWith("Invalid recipient");
        });
    });

    describe("Token URI management", function () {
        it("should revert when querying non-existent token URI", async function () {
            await expect(simpleERC721.tokenURI(0)).to.be.revertedWith("URI query for nonexistent token");
        });

        it("should revert when setting URI for non-existent token", async function () {
            await expect(simpleERC721._setTokenURI(1, "some-uri")).to.be.revertedWith("URI set of nonexistent token");
        });
    });

    describe("Edge Cases & Security", function () {
        it("should not allow integer overflow on minting", async function () {
            // Ensure that _tokenIdCounter cannot exceed MAX_SUPPLY
            await expect(() => {
                for (let i = 0; i <= 10000; i++) {
                    simpleERC721.connect(owner).mint(addr1.address, `uri${i}`);
                }
            }).to.throw(/Max supply reached/);
        });
    });

    describe("Compatibility & Interface", function () {
        it("should return correct interface support", async function () {
            expect(await simpleERC721.supportsInterface("0x80ac58cd")).to.equal(true); // ERC721
            expect(await simpleERC721.supportsInterface("0x2a55205a")).to.equal(true); // EIP-2981
        });
    });
});
```

### Key Aspects Covered:

1. **Deployment Checks**: Ensures that the contract initializes correctly.
2. **Minting Functionality**: Tests both successful token mints and scenario where token minting should fail due to permissions or limits.
3. **Royalty Management**: Verifies royalty settings and updates, including boundary conditions for fee and invalid addresses.
4. **Token URI Management**: Checks URI setting and access.
5. **Edge Cases & Security**: Looks for overflows and ensures limits prevent minting beyond supply.
6. **EIP Standards Compliance**: Confirms that the contract follows expected interface standards. 

### Testing Strategy & Best Practices:
- **Reverts and Negative Test Cases**: Explicitly test conditions that should fail to avoid unexpected behaviors.
- **Event Emissions**: Verify events are emitted correctly on state changes.
- **Boundary Testing**: Check limits, such as `MAX_SUPPLY`, ensuring they handle edge cases accurately.
- **Gas Usage & Efficiency**: Although not explicitly tested here, consider monitoring track gas usage for optimization opportunities if necessary.

This comprehensive suite ensures functionality and security of the `SimpleERC721WithRoyalties` contract, making it robust against common pitfalls.