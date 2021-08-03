let db;
let budgetVersion;

// Request for a "budget" database.
const request = indexedDB.open('BudgetDB', budgetVersion || 21);

request.onupgradeneeded = function (e) {
  console.log('Upgrade needed in IndexDB');

  const { aVersion } = e;
  const bVersion = e.newVersion || db.version;

  console.log(`DB Updated from version ${aVersion} to ${bVersion}`);

  db = e.target.result;

  if (db.objectStoreNames.length === 0) {
    db.createObjectStore('BudgetStore', { autoIncrement: true });
  }
};

request.onerror = function (e) {
  console.log(`Try again! ${e.target.errorCode}`);
};

function checkDatabase() {
  console.log('check db requested');

  // Open transaction on your BudgetStore db
  let transaction = db.transaction(['BudgetStore'], 'readwrite');

  // Access BudgetStore object
  const store = transaction.objectStore('BudgetStore');

  // Getting all records from store and set to a variable
  const getAll = store.getAll();

  // On succes of request
  getAll.onsuccess = function () {
    // Bulking new items when back online
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // In case the response is not empty
          if (res.length !== 0) {
            // Open another transaction to BudgetStore with the ability to read and write
            transaction = db.transaction(['BudgetStore'], 'readwrite');

            // Assign the current store to a variable
            const currStore = transaction.objectStore('BudgetStore');

            // Clear existing entries
            currStore.clear();
            console.log('Clearing store 🧹');
          }
        });
    }
  };
}

request.onsuccess = function (e) {
  console.log('success');
  db = e.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log('Backend online! 🗄️');
    checkDatabase();
  }
};

const saveRecord = (record) => {
  console.log('Save record invoked');
  // Create a transaction on the BudgetStore db with readwrite access
  const transaction = db.transaction(['BudgetStore'], 'readwrite');

  // Access your BudgetStore object store
  const store = transaction.objectStore('BudgetStore');

  // Add record to your store with add method.
  store.add(record);
};

// Listen for app coming back online
window.addEventListener('online', checkDatabase);