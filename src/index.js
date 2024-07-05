import axios from 'axios';
import { Address } from 'ton';

const nftCollectionUrl = 'https://tonapi.io/v2/nfts/collections/EQBluYU_TlovKRwG1-InhSyYYec2LY89h4Ly7oEMwjhJH6l3/items';
const nftHistoryUrlTemplate = 'https://tonapi.io/v2/accounts/{account_id}/nfts/history';

const fetchData = async (url, headers = {}) => {
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data: ${error}`);
    return null;
  }
};

const convertToTonAddress = (address) => {
  try {
    return Address.parse(address).toString(true, true, true);
  } catch (error) {
    console.error(`Error converting address: ${error}`);
    return address;
  }
};

const processNftData = (nftData) => {
  const nftAddresses = [];

  console.log("Fetched NFT Data:", JSON.stringify(nftData, null, 2));

  if (nftData.items) {
    nftData.items.forEach((item) => {
      const nftAddress = item.address;
      nftAddresses.push(nftAddress);
    });
  }

  return nftAddresses;
};

const fetchNftHistory = async (nftAddress, headers) => {
  const url = nftHistoryUrlTemplate.replace('{account_id}', nftAddress);
  return await fetchData(url, headers);
};

const processNftHistoryData = (nftData) => {
  const callerAddresses = {};
  const firstTransaction = {};

  console.log("Fetched NFT History Data:", JSON.stringify(nftData, null, 2));

  if (nftData.events) {
    nftData.events.forEach((event) => {
      const caller = event.source;
      const timestamp = event.timestamp;

      console.log(`Caller: ${caller}, Timestamp: ${timestamp}`);

      if (caller && timestamp) {
        if (!callerAddresses[caller]) {
          callerAddresses[caller] = [];
        }
        callerAddresses[caller].push(timestamp);

        if (!firstTransaction[caller]) {
          firstTransaction[caller] = timestamp;
        }
      }
    });
  }

  return { callerAddresses, firstTransaction };
};

const main = async () => {
  const nftData = await fetchData(nftCollectionUrl);
  if (!nftData) return;

  const nftAddresses = processNftData(nftData);

  const headers = {
    'accept': 'application/json',
    'Accept-Language': 'ru-RU,ru;q=0.5'
  };

  const combinedCallerAddresses = {};
  const combinedFirstTransaction = {};

  for (const nftAddress of nftAddresses) {
    const nftHistoryData = await fetchNftHistory(nftAddress, headers);
    if (!nftHistoryData) continue;

    const { callerAddresses, firstTransaction } = processNftHistoryData(nftHistoryData);

    for (const [address, timestamps] of Object.entries(callerAddresses)) {
      if (!combinedCallerAddresses[address]) {
        combinedCallerAddresses[address] = [];
      }
      combinedCallerAddresses[address] = combinedCallerAddresses[address].concat(timestamps);
    }

    for (const [address, timestamp] of Object.entries(firstTransaction)) {
      if (!combinedFirstTransaction[address]) {
        combinedFirstTransaction[address] = timestamp;
      }
    }
  }

  const uniqueAddresses = Object.keys(combinedCallerAddresses).length;
  const multipleInteractions = Object.entries(combinedCallerAddresses).filter(([address, timestamps]) => timestamps.length > 1);
  const firstTransactions = Object.entries(combinedFirstTransaction).map(([address, utime]) => ({ address, utime }));

  console.log(`Total unique addresses interacted: ${uniqueAddresses}`);
  console.log("Addresses that interacted more than once:");
  multipleInteractions.forEach(([address, timestamps]) => {
    console.log(`Address ${address} interacted ${timestamps.length} times.`);
  });
  console.log("First transactions:");
  firstTransactions.forEach(({ address, utime }) => {
    const date = new Date(utime);
    console.log(`Address: ${address}, First Transaction Time: ${date.toISOString()}`);
  });
};

main();
