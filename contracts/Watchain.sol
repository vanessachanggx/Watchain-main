// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Watchain {
    enum WatchStatus {Available, Sold}
    
    string public companyName;
    uint watchCount;

    constructor() {
        watchCount = 0;
        companyName = "Watchain";
    }

    struct WatchInformation {
        string serialNumber;
        string model;
        string collection;
        string dateOfManufacture;
        string authorizedDealer;
        uint price;
        WatchStatus status;
    }

    struct OwnershipRecord {
        address payable ownerId;
        string ownerName;
        string transferDate;
        string contactNumber;
        string email;
    }

    struct ServiceHistory {
        string serviceDate;
        string details;
        string replacementParts;
    }

    struct Watch {
        WatchInformation watchInfo;
        OwnershipRecord[] ownershipRecords;
        ServiceHistory[] serviceHistory;
    }

    mapping(uint256 => Watch) public watches;

    event WatchRegistered(
        uint256 watchId, 
        string serialNumber, 
        string model, 
        string collection
    );

    event OwnershipRecorded(
        uint256 watchId,
        address payable ownerId,
        string ownerName,
        string transferDate
    );

    event ServiceRecordAdded(
        uint256 watchId, 
        string serviceDate, 
        string details,
        string replacementParts
    );

    event WatchPurchased(
        uint256 watchId,
        string serialNumber,
        uint price,
        address payable owner,
        WatchStatus status
    );

    function getCompanyName() public view returns (string memory) {
        return companyName;
    }

    function getNoOfWatches() public view returns (uint) {
        return watchCount;
    }

    function registerWatch() public returns (uint256) {
        watchCount++;
        return watchCount;
    }

    function addWatchInfo(
        uint256 watchId,
        string memory _serialNumber,
        string memory _model,
        string memory _collection,
        string memory _dateOfManufacture,
        string memory _authorizedDealer,
        uint _price
    ) public {
        watches[watchId].watchInfo = WatchInformation(_serialNumber, _model, _collection, _dateOfManufacture, _authorizedDealer, _price, WatchStatus.Available);
        emit WatchRegistered(watchId, _serialNumber, _model, _collection);
    }

    function addOwnershipRecord(
        uint256 watchId,
        string memory _ownerName,
        string memory _transferDate,
        string memory _contactNumber,
        string memory _email
    ) public {
        watches[watchId].ownershipRecords.push(OwnershipRecord(payable(msg.sender), _ownerName, _transferDate, _contactNumber, _email));
        emit OwnershipRecorded(watchId, payable(msg.sender), _ownerName, _transferDate);
    }

    function addServiceRecord(
        uint256 watchId,
        string memory _serviceDate,
        string memory _details,
        string memory _replacementParts
    ) public {
        watches[watchId].serviceHistory.push(ServiceHistory(_serviceDate, _details, _replacementParts));
        emit ServiceRecordAdded(watchId, _serviceDate, _details, _replacementParts);
    }

    function getWatchInfo(uint256 watchId) public view returns (WatchInformation memory) {
        return watches[watchId].watchInfo;
    }

    function getOwnershipRecords(uint256 watchId) public view returns (OwnershipRecord[] memory) {
        return watches[watchId].ownershipRecords;
    }

    function getServiceHistory(uint256 watchId) public view returns (ServiceHistory[] memory) {
        return watches[watchId].serviceHistory;
    }

    function purchaseWatch(uint256 watchId) public payable {
        Watch storage watch = watches[watchId];
        require(watchId > 0 && bytes(watch.watchInfo.serialNumber).length != 0, "Watch ID cannot be empty");
        require(msg.value >= watch.watchInfo.price, "Insufficient funds");
        require(watch.watchInfo.status == WatchStatus.Available, "Watch is not available");
        
        uint256 currentOwnerId = watch.ownershipRecords.length;
        address payable seller = watch.ownershipRecords[currentOwnerId - 1].ownerId;
        require(seller != msg.sender, "Seller cannot be the buyer");

        watch.watchInfo.status = WatchStatus.Sold;
        payable(seller).transfer(msg.value);

        emit WatchPurchased(watchId, watch.watchInfo.serialNumber, watch.watchInfo.price, payable(msg.sender), WatchStatus.Sold);
    }
}
