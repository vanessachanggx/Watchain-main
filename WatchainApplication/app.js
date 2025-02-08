// Import the libraries (express, fs, node multer) using require
const express = require('express');
const { Web3 } = require('web3');
const fs = require("fs");
const Watchain = require('../build/Watchain.json');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Remove any ../ from the path
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Set up view engine from ejs library
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false })); // Enable form processing

// --- Global Variables (Similar to MetaPetProjectDApp) ---
let web3;
let GanacheWeb3;
let account = '';
let watchCount = 0;
let watches = [];
let listOfWatches = [];
let contractInfo;
let loading = false;  // Define the loading variable, set to true initially
let NoOfWatches = 0;  // Initialize NoOfWatches
var addObj = null;
var addFunc = null;
var addEnabled = null;


// Function to load blockchain data
async function loadBlockchainData() {
  try {
      loading = true;  // Set loading to true when starting the loading process
      let web3Instance;

      // Check if web3 is already initialized
      if (!web3) {
          // Fallback to Ganache
          console.log("MetaMask not available, using Ganache");
          GanacheWeb3 = new Web3("http://127.0.0.1:7545");
          web3 = GanacheWeb3;
      }

      // Load account from the network/blockchain/ganache
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];
      const networkId = await web3.eth.net.getId();
      const networkData = Watchain.networks[networkId];  // Ensure Watchain is defined

      if (!networkData) {
        throw new Error('Watchain contract not deployed to detected network');
      }

      contractInfo = new web3.eth.Contract(Watchain.abi, networkData.address);  // Ensure Watchain.abi is defined
      const cnt = await contractInfo.methods.getNoOfWatches().call();
      console.log(`Watch count from blockchain: ${cnt.toString()}`);

      // Initialize the NoOfWatches variable here
      NoOfWatches = cnt;

      const loadSmartContractWatches = async () => {
        const watches = [];
        for (let i = 1; i <= cnt; i++) {
          const [
            watchInfo, ownershipInfo, serviceHistoryInfo
          ] = await Promise.all([
            contractInfo.methods.getWatchInfo(i).call(),
            contractInfo.methods.getOwnershipRecords(i).call(),
            contractInfo.methods.getServiceHistory(i).call()
          ]);

          const watchData = {
            id: i,
            watchInfo: formatWatchInfo(watchInfo),
            ownership: formatOwnershipRecords(ownershipInfo),
            serviceHistory: formatServiceHistoryInfo(serviceHistoryInfo)
          };
          watches.push(watchData);
        }
        return watches;
      };

      const [smartContractWatches] = await Promise.all([loadSmartContractWatches()]);

      listOfWatches = smartContractWatches;
      console.log(`Total watches loaded from blockchain: ${listOfWatches.length}`);
      return { account, contractInfo, listOfWatches, NoOfWatches };
  } catch (error) {
      console.error('Error loading blockchain data:', error);
      throw error;
  } finally {
      loading = false;  // Set loading to false once data loading is complete
  }
}

// Define formatting functions for the blockchain data
function formatWatchInfo(watchInfo) {
    return {
        serialNumber: watchInfo[0],
        model: watchInfo[1],
        collection: watchInfo[2],
        dateOfManufacture: watchInfo[3],
        authorizedDealer: watchInfo[4],
        watchImage: watchInfo[5]  // Changed from 'image' to 'watchImage'
    };
}

function formatOwnershipRecords(ownershipRecords) {
    if (Array.isArray(ownershipRecords)) {
        return ownershipRecords.map(record => {
            // Safely extract data, providing defaults for missing fields
            const ownerId = record[0];
            const ownerName = record[1];
            let transferDate = record[2];
            const contactNumber = record[3];
            const email = record[4];
            return {
                ownerId: ownerId,
                ownerName: ownerName,
                transferDate: transferDate,
                contactNumber: contactNumber,
                email: email
            };
        });
    } else {
        return [];
    }
}

function formatServiceHistoryInfo(serviceHistoryInfo) {
    if (Array.isArray(serviceHistoryInfo)) {
      return serviceHistoryInfo.map(history => {
        return {
          serviceDate: history[0],
          serviceDetails: history[1],
          replacementParts: history[2]
        };
      });
    } else {
      // If serviceHistoryInfo is not an array, return an empty array
      return [];
    }
  }


// In your Express app, add this new endpoint:
app.get('/loading-status', (req, res) => {
    res.json({ loading: loading });
});

app.get('/', async (req, res) => {
  console.log("home page");
  try {
      // Load blockchain data using Ganache
      await loadBlockchainData();

      console.log(loading);
      res.render('index', {
          acct: account,
          cnt: NoOfWatches,
          watches: listOfWatches,
          loading: loading,
          Image: 'default.jpg', // Add a default image if needed
          status: false, // Initially set to false, updated on client-side
          addObject: JSON.stringify(addObj),
          addFunction: addFunc,
          addStatus: addEnabled
      });
  } catch (error) {
      console.error('Error loading watches:', error);
      res.render('index', {
          acct: account,
          cnt: 0,
          watches: [],
          loading: loading,
          Image: 'default.jpg',
          status: false, // Set to false on error
          addObject: JSON.stringify(addObj),
          addFunction: addFunc,
          addStatus: addEnabled
      });
  }
});

app.post('/web3ConnectData', express.json({ limit: '1mb' }), async (req, res) => {
    try {
        const { watchDataRead, contractAddress, acct, nWatches } = req.body;
        console.log(watchDataRead);
        console.log(contractAddress);
        console.log(acct);
        //console.log(nWatches);
        NoOfWatches = nWatches;
        account = acct;
        console.log(nWatches);
        listOfWatches = [];
        // Create a comprehensive watch object with all related information
        for (let i = 0; i < nWatches; i++) {
            console.log(i);
            console.log(watchDataRead[i].watchInfo);
            console.log(watchDataRead[i].ownershipInfo);
            const watchData =
            {
                id: i + 1,
                watchInfo: formatWatchInfo(watchDataRead[i].watchInfo),
                ownership: formatOwnershipInfo(watchDataRead[i].ownershipInfo),
                serviceHistory: formatServiceHistoryInfo(watchDataRead[i].serviceHistoryInfo),
            };
            listOfWatches.push(watchData);
        }
        //console.log(listOfWatches);
        loading = false;
        // Send response back to frontend
        res.json({
            success: true,
            data: listOfWatches,
            message: 'Watch data processed successfully'
        });
    } catch (error) {
        console.error('Error in web3ConnectData:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get('/watch/:id', async (req, res) => {
    try {
        const watchId = req.params.id;
        console.log(watchId);

        // Get watch details from smart contract
        const [watchInfo, ownershipInfo, serviceHistoryInfo] = await Promise.all([
            contractInfo.methods.getWatchInfo(watchId).call(),
            contractInfo.methods.getOwnershipRecords(watchId).call(),
            contractInfo.methods.getServiceHistory(watchId).call()
        ]);

        const watchDetails = {
            id: watchId,
            watchInfo: formatWatchInfo(watchInfo),
            ownership: formatOwnershipRecords(ownershipInfo),
            serviceHistory: formatServiceHistoryInfo(serviceHistoryInfo)
        };

        res.render('watchDetails', {
            watch: watchDetails,
            acct: account
        });
    } catch (error) {
        console.error('Error fetching watch details:', error);
        res.status(404).send('Watch not found');
    }
});

// Define routes - to add the watch using the path /registerWatch
app.get('/registerWatch', (req, res) => {
  res.render('registerWatch', { acct: account} );
});

app.post('/', upload.single('watchImage'), async (req, res) => {
    console.log('Request body:', req.body);
    const {
        serialNumber, model, collection, dateOfManufacture,
        authorizedDealer, price
    } = req.body;

    // Ensure all fields are present
    if (!serialNumber || !model || !collection || !dateOfManufacture || !authorizedDealer || !price) {
        return res.status(400).send('All fields are required.');
    }

    try {
        // Initialize watchImagePath from the uploaded file
        const watchImagePath = req.file ? req.file.filename : null;

        const stringSerialNumber = serialNumber.toString();
        const numPrice = parseInt(price); //Parse string to number

        // Estimate gas required for the transaction
        const estimatedGas = await contractInfo.methods.registerWatch(
            stringSerialNumber, model, collection, dateOfManufacture,
            authorizedDealer, watchImagePath, numPrice
        ).estimateGas({ from: account });

        // Send the transaction
        await contractInfo.methods.registerWatch(
            stringSerialNumber, model, collection, dateOfManufacture,
            authorizedDealer, watchImagePath, numPrice
        ).send({
            from: account,
            gas: BigInt(estimatedGas) + BigInt(50000)
        });

        res.render('index');
    } catch (error) {
        console.error('Error registering watch:', error);
        res.status(500).send('Error registering watch');
    }
});


  app.post('/setFunc', async (req, res) => {
    addEnabled = null;
    res.json({
      success: true,
       message: 'set data successfully'
    });
  });


// GET route to display the add owner form
app.get('/addOwner/:watchId', async (req, res) => {
    try {
        const watchId = req.params.watchId;
        res.render('addOwner', {
            acct: account,
            watchId: watchId
        });
    } catch (error) {
        console.error('Error loading add owner page:', error);
        res.status(500).send('Error loading add owner page');
    }
});

app.post('/addOwner/:watchId', async (req, res) => {
    try {
        const watchId = req.params.watchId;
        const {
            ownerName,
            transferDate,
            contact,
            email
        } = req.body;

        // Convert the transfer date to ISO string
        const formattedTransferDate = new Date(transferDate).toISOString();

        // Estimate gas for the transaction
        const estimatedGas = await contractInfo.methods.addOwnershipRecord(
            watchId,
            ownerName,
            formattedTransferDate,
            contact,
            email
        ).estimateGas({ from: account });

        // Execute the transaction
        await contractInfo.methods.addOwnershipRecord(
            watchId,
            ownerName,
            formattedTransferDate,
            contact,
            email
        ).send({
            from: account,
            gas: BigInt(estimatedGas) + BigInt(50000)
        });

        res.redirect(`/watch/${watchId}`);
    } catch (error) {
        console.error('Error adding owner:', error);
        res.status(500).send('Error adding owner');
    }
});

// GET route to display the add service form
app.get('/addService/:watchId', async (req, res) => {
    try {
        const watchId = req.params.watchId;
        res.render('addService', {
            acct: account,
            watchId: watchId
        });
    } catch (error) {
        console.error('Error loading add service page:', error);
        res.status(500).send('Error loading add service page');
    }
});

app.post('/addService/:watchId', async (req, res) => {
  try {
      const watchId = req.params.watchId;
      const { serviceDate, serviceDetails, replacementParts } = req.body;

      // Convert the service date to ISO string
      const formattedServiceDate = new Date(serviceDate).toISOString();

      // Estimate gas for the transaction
      const estimatedGas = await contractInfo.methods.addServiceRecord(
          watchId,
          formattedServiceDate,
          serviceDetails,
          replacementParts
      ).estimateGas({ from: account });

      // Execute the transaction
      await contractInfo.methods.addServiceRecord(
          watchId,
          formattedServiceDate,
          serviceDetails,
          replacementParts
      ).send({
          from: account,
          gas: BigInt(estimatedGas) + BigInt(50000)
      });

      res.redirect(`/watch/${watchId}`);
  } catch (error) {
      console.error('Error adding service record:', error);
      res.status(500).send('Error adding service record');
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
