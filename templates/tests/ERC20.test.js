const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AllowlistedERC20", function () {
  let token;
  let owner;
  let minter;
  let user;
  let nonMinter;

  beforeEach(async function () {
    [owner, minter, user, nonMinter] = await ethers.getSigners();
    
    const TokenFactory = await ethers.getContractFactory("AllowlistedERC20");
    token = await TokenFactory.deploy("Test Token", "TEST");
    await token.waitForDeployment();
    
    // Add a minter
    await token.addMinter(minter.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should set the correct token name and symbol", async function () {
      expect(await token.name()).to.equal("Test Token");
      expect(await token.symbol()).to.equal("TEST");
    });
  });

  describe("Minter management", function () {
    it("Should allow the owner to add a minter", async function () {
      await token.addMinter(user.address);
      expect(await token.isMinter(user.address)).to.equal(true);
    });

    it("Should emit an event when a minter is added", async function () {
      await expect(token.addMinter(user.address))
        .to.emit(token, "MinterAdded")
        .withArgs(user.address);
    });

    it("Should not allow non-owners to add a minter", async function () {
      await expect(token.connect(minter).addMinter(user.address))
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(minter.address);
    });

    it("Should allow the owner to remove a minter", async function () {
      await token.removeMinter(minter.address);
      expect(await token.isMinter(minter.address)).to.equal(false);
    });

    it("Should emit an event when a minter is removed", async function () {
      await expect(token.removeMinter(minter.address))
        .to.emit(token, "MinterRemoved")
        .withArgs(minter.address);
    });
  });

  describe("Minting", function () {
    it("Should allow a minter to mint tokens", async function () {
      await token.connect(minter).mint(user.address, ethers.parseEther("100"));
      expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should not allow non-minters to mint tokens", async function () {
      await expect(token.connect(nonMinter).mint(user.address, ethers.parseEther("100")))
        .to.be.revertedWith("AllowlistedERC20: caller is not a minter");
    });

    it("Should not allow minting to the zero address", async function () {
      await expect(token.connect(minter).mint(ethers.ZeroAddress, ethers.parseEther("100")))
        .to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should not allow minting zero tokens", async function () {
      await expect(token.connect(minter).mint(user.address, 0))
        .to.be.revertedWith("Amount must be greater than zero");
    });

    it("Should update total supply after minting", async function () {
      const initialSupply = await token.totalSupply();
      await token.connect(minter).mint(user.address, ethers.parseEther("100"));
      const newSupply = await token.totalSupply();
      expect(newSupply - initialSupply).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Token transfers", function () {
    beforeEach(async function () {
      // Mint some tokens to user for transfer tests
      await token.connect(minter).mint(user.address, ethers.parseEther("1000"));
    });

    it("Should allow token holders to transfer tokens", async function () {
      await token.connect(user).transfer(nonMinter.address, ethers.parseEther("100"));
      expect(await token.balanceOf(nonMinter.address)).to.equal(ethers.parseEther("100"));
      expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("900"));
    });
  });
}); 