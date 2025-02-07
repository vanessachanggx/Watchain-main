const Watchain = artifacts.require('./contracts/Watchain.sol');

contract('Test Watchain', ([account, seller, buyer]) => {
    let watchain;
    console.log("Account: " + account);
    console.log("Seller: " + seller);
    console.log("Buyer: " + buyer);

    // Deploy a new instance of the contract before running the tests
    before(async () => {
        watchain = await Watchain.deployed(); 
    });

    describe('deployment', async () => {
        it('deploys successfully, address check verified', async () => {
            // Verify the contract's deployment address
            const address = watchain.address;
            console.log("Contract Address: " + address);

            // Test for address
            assert.notEqual(address, 0x0, "Address should not be 0x0");
            assert.notEqual(address, '', "Address should not be an empty string");
            assert.notEqual(address, null, "Address should not be null");
            assert.notEqual(address, undefined, "Address should not be undefined");
        });
    });

    describe('CompanyName', async () => {
        it("has the correct company name", async () => {
            const companyName = await watchain.companyName(); // Call the public variable `companyName`
            assert.equal(companyName, "Watchain", "The company name is not correct");
        });
    });

    describe('Registering watch', async () => {
        let result, watchCount;
    
        before(async () => {
            // Register the watch 
            result = await watchain.registerWatch();
    
            // Verify the total number of watches after registration
            watchCount = await watchain.getNoOfWatches();
            console.log("Watch Count: " + watchCount.toString());
        });
    
        it('verifying total watch count', async () => {
            assert.notEqual(watchCount.toNumber(), 0, "The watch count should not be zero after registration");
        });
    });
    
    describe('Adding Watch Information', async () => {
        let result;
        before(async () => {
            result = await watchain.addWatchInfo(
                1,
                "SN12345", // Serial Number
                "Explorer", // Model
                "Classic Collection", // Collection
                "2021-05-10", // Date of Manufacture
                "Authorized Dealer", // Authorized Dealer
                5000 // Price
            );
        });
    
        it('verifying watch serial number', async () => {
            const watchInfo = await watchain.getWatchInfo(1);
            assert.equal(watchInfo.serialNumber, "SN12345", "Watch serial number is correct");
        });
    
        it('verifying watch model', async () => {
            const watchInfo = await watchain.getWatchInfo(1);
            assert.equal(watchInfo.model, "Explorer", "Watch model is correct");
        });
    
        it('verifying watch collection', async () => {
            const watchInfo = await watchain.getWatchInfo(1);
            assert.equal(watchInfo.collection, "Classic Collection", "Watch collection is correct");
        });
    });

    describe('Adding Ownership', async () => {
        let result;
    
        before(async () => {
            // Add ownership record for new owner
            result = await watchain.addOwnershipRecord(
                1,                            // Watch ID
                "Alice Johnson",              // Owner Name
                "2021-05-20",                // Transfer Date
                "555-1234",                  // Contact Number
                "alice.johnson@example.com", // Email
                { from: seller }              // Seller
            );
        });

        it('verifying ownership record', async () => {
            const event = result.logs[0].args;
            assert.equal(event.ownerId, seller, "Owner ID is correct");
            assert.equal(event.ownerName, "Alice Johnson", "Owner name is correct");
            assert.equal(event.transferDate, "2021-05-20", "Transfer date is correct");
        });

        it('verifying new owner contact details', async () => {
            const ownershipRecords = await watchain.getOwnershipRecords(1);
            const latestOwnership = ownershipRecords[ownershipRecords.length - 1];
            assert.equal(latestOwnership.contactNumber, "555-1234", "Owner contact is correct");
            assert.equal(latestOwnership.email, "alice.johnson@example.com", "Owner email is correct");
        });
    });

    describe('Adding Service Record', async () => {
        let result;
    
        before(async () => {
            // Add a service record for the watch
            result = await watchain.addServiceRecord(
                1,                            // Watch ID
                "2022-06-15",                 // Service Date
                "Battery replacement",        // Service Details
                "Battery"                     // Replacement Parts
            );
        });

        it('verifying service record details', async () => {
            const event = result.logs[0].args;
            assert.equal(event.serviceDate, "2022-06-15", "Service date is correct");
            assert.equal(event.details, "Battery replacement", "Service details are correct");
            assert.equal(event.replacementParts, "Battery", "Replacement parts are correct");
        });
    
        it('verifying service history addition', async () => {
            const serviceHistory = await watchain.getServiceHistory(1);
            const latestServiceRecord = serviceHistory[serviceHistory.length - 1];
            assert.equal(latestServiceRecord.serviceDate, "2022-06-15", "Service date matches the latest record");
            assert.equal(latestServiceRecord.details, "Battery replacement", "Service details match the latest record");
            assert.equal(latestServiceRecord.replacementParts, "Battery", "Replacement parts match the latest record");
        });
    });

    describe('Purchasing a Watch', async () => {
        let result;

        before(async () => {
            // Purchase the watch
            result = await watchain.purchaseWatch(1, { from: buyer, value: web3.utils.toWei('5', 'ether') });
        });

        it('verifying watch purchase', async () => {
            const event = result.logs[0].args;
            assert.equal(event.watchId.toNumber(), 1, "Watch ID is correct");
            assert.equal(event.owner, buyer, "Buyer address is correct");
            assert.equal(event.status.toString(), "1", "Watch status is correct (Sold)");
        });
    });
});
