// RecoveryPaper.jsx (main component)
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setIDWithKey, clearSelection } from './store/slices/CustomerSearch';
import { useLocalStorageState } from './hooks/LocalStorage';
import { useRealOnlineStatus } from './hooks/IsOnlineHook';
import { takeScreenShot } from './fuctions';
import useGeolocation from './hooks/geolocation';
import { Container, Box, Stack, Typography, TextField, Snackbar, Alert } from '@mui/material';


// Custom hooks
import { useCustomerSelection } from './hooks/useCustomerSelection';
import { usePaymentInputs } from './hooks/usePaymentInputs';
import { useExpenseInputs } from './hooks/useExpenseInputs';
import { useEntries } from './hooks/useEntries';


// Components
import CustomerSearchSection from './components/recovery/CustomerSearchSection';
import PaymentInputsSection from './components/recovery/PaymentInputsSection';
import EntriesListSection from './components/recovery/EntriesListSection';
import TotalsDisplaySection from './components/recovery/TotalsDisplaySection';
import ExpenseInputsSection from './components/recovery/ExpenseInputsSection';
import FormActionsSection from './components/recovery/FormActionsSection';

// currency formatting now centralized in utils/formatCurrency and used within child components

const sendWhatsapp = (entry, number) => {
  console.log(entry, number)

  if (!entry || !number) return alert('entry or number is missing')



  const message = `
*Customer:* ${entry?.name || 'N/A'}
*Amount:* RS.${(entry?.amounts?.cash || 0) +
    (entry?.amounts?.jazzcash || 0) +
    (entry?.amounts?.easypaisa || 0) +
    (entry?.amounts?.crownWallet || 0) +
    (entry?.amounts?.meezanBank || 0) +
    (entry?.amounts?.online || 0)}/-
*Ref:* Received By ${entry?.userName || 'Ahmad International'}
*Date:* ${new Date().toLocaleString()}
*FROM: AHMAD INTERNATIONAL-FSD*
`;

  const formattedNumber = number.replace(/\D/g, ""); // remove spaces/dashes

  const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");
};

const RecoveryPaper = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const routePath = location.pathname;
  const storageKey = `accountID-${routePath}`;
  const [searchParams] = useSearchParams();
  const { coordinates, address } = useGeolocation();
  const isOnline = useRealOnlineStatus();
  const user = JSON.parse(localStorage.getItem('user'));

  const [route, setRoute] = useLocalStorageState('recoveryPaperRoute', '');
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [errorToast, setErrorToast] = useState({ open: false, message: '' });
  const targetRef = useRef(null);
  const cashInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const isOperator = user?.userType?.toLowerCase().includes('operator');
  const isSpo = user?.userType?.toLowerCase().includes('spo');

  const expenseKeys = isOperator
    ? ['entertainment', 'bilty', 'repair', 'zaqat', 'petrol', 'localPurchase']
    : isSpo
      ? ['exp', 'salary', 'salesBonus']
      : ['petrol', 'toll', 'repair'];

  // Custom hooks
  const {
    selectedCustomer,
    accountID,
    customerName,
    balance,
    overDue,
    remainingBalance,
    loadingFinancials,
    error,
    handleFetchData,
    handleReset,
    setRemainingBalance,
  } = useCustomerSelection(storageKey, routePath);

  const {
    cashAmount,
    jazzcashAmount,
    tcAmount,
    harrAmount,
    onlineAmount,
    easypaisaAmount,
    crownWalletAmount,
    meezanBankAmount,
    crownFitAmount,
    paymentImages, // changed from paymentImage
    remainingBalance: paymentRemainingBalance,
    handleCashAmountChange,
    handleJazzcashAmountChange,
    handleOnlineAmountChange,
    handleEasypaisaAmountChange,
    handleCrownWalletAmountChange,
    handleMeezanBankAmountChange,
    handleTcAmountChange,
    handleHarrAmountChange,
    handleCrownFitAmountChange,
    calculateRemainingBalance,
    resetPaymentInputs,
    handlePaymentImageChange, // changed from setPaymentImage
  } = usePaymentInputs();

  const {
    entries,
    isLoading,
    totalAmount,
    totalCash,
    totalJazzcash,
    totalEasypaisa,
    totalCrownWallet,
    totalTc,
    totalHarr,  
    totalMeezanBank,
    addEntry,
    handleSyncOneEntry,
    setIsLoading,
    resetEntries,
    handleRemoveEntry
  } = useEntries();

  // Effects
  useEffect(() => {
    const id = searchParams.get('acid');
    dispatch(setIDWithKey({ key: 'recovery', value: parseInt(id) }));
  }, [searchParams, dispatch]);
  // Effects

  useEffect(() => {
    const newRemainingBalance = calculateRemainingBalance(balance, {
      cashAmount,
      jazzcashAmount,
      onlineAmount,
      easypaisaAmount,
      tcAmount,
      harrAmount,
      crownFitAmount,
      crownWalletAmount,
      meezanBankAmount,
    });
    setRemainingBalance(newRemainingBalance);
  }, [
    balance,
    cashAmount,
    jazzcashAmount,
    onlineAmount,
    easypaisaAmount,
    crownWalletAmount,
    meezanBankAmount,
    tcAmount,
    harrAmount,
    calculateRemainingBalance,
    setRemainingBalance,
  ]);

  useEffect(() => {
    if (!isOnline) return;

    const syncAll = async () => {
      if (!navigator.onLine) return;
      const unsyncedEntries = entries.filter((entry) => !entry.status && (entry.retryCount || 0) < 10);
      if (unsyncedEntries.length === 0) return;

      for (const entry of unsyncedEntries) {
         if (entry.status) continue;
         const { success, errors } = await handleSyncOneEntry(entry, coordinates, address);
         if (!success && errors && errors.length > 0) {
             setErrorToast({ open: true, message: `Retry failed: ${errors.join(' | ')}` });
         }
      }
    };

    syncAll();
    const intervalId = setInterval(syncAll, 15000);

    return () => clearInterval(intervalId);
  }, [isOnline, entries, handleSyncOneEntry, coordinates, address]);

  useEffect(() => {
    if (selectedCustomer) {
      cashInputRef.current?.focus();
    }
  }, [selectedCustomer]);

  // Handlers
  const handleLedgerClick = useCallback(() => {
    if (!selectedCustomer || !selectedCustomer.acid) {
      return;
    }

    const endDateObj = new Date();
    const startDateObj = new Date();
    startDateObj.setMonth(startDateObj.getMonth() - 3);

    const ledgerStartDate = startDateObj.toISOString().split('T')[0];
    const ledgerEndDate = endDateObj.toISOString().split('T')[0];

    const url = `/ledger?name=${encodeURIComponent(
      selectedCustomer.name || ''
    )}&acid=${encodeURIComponent(
      selectedCustomer.acid
    )}&startDate=${encodeURIComponent(
      ledgerStartDate
    )}&endDate=${encodeURIComponent(
      ledgerEndDate
    )}&from=${encodeURIComponent(routePath)}`;

    navigate(url);
  }, [selectedCustomer, navigate, routePath]);

  const handleAddEntry = useCallback(async () => {
    if (!selectedCustomer) {
      alert('Customer not selected. Please verify the Account ID or search again.');
      return;
    }

    const parsedCash = parseFloat(cashAmount) || 0;
    const parsedJazzcash = parseFloat(jazzcashAmount) || 0;
    const parsedEasypaisa = parseFloat(easypaisaAmount) || 0;
    const parsedCrownWallet = parseFloat(crownWalletAmount) || 0;
    const parsedMeezanBank = parseFloat(meezanBankAmount) || 0;
    const parsedOnline = parseFloat(onlineAmount) || 0;
    const parsedTc = parseFloat(tcAmount) || 0;
    const parsedHarr = parseFloat(harrAmount) || 0;
    const parsedCrownFit = parseFloat(crownFitAmount) || 0;

    const currentEntryTotal =
      parsedCash +
      parsedJazzcash +
      parsedEasypaisa +
      parsedTc +
      parsedHarr +
      parsedCrownWallet +
      parsedOnline +
      parsedMeezanBank +
      parsedCrownFit;

    if (currentEntryTotal <= 0) {
      alert('Please enter a valid positive amount for at least one payment method.');
      cashInputRef.current?.focus();
      return;
    }

    const newEntry = {
      id: selectedCustomer?.acid,
      name: selectedCustomer.name,
      UrduName: selectedCustomer.UrduName,
      description,
      amounts: {
        cash: parsedCash,
        jazzcash: parsedJazzcash,
        easypaisa: parsedEasypaisa,
        crownWallet: parsedCrownWallet,
        meezanBank: parsedMeezanBank,
        online: parsedOnline,
        tc: parsedTc,
        harr: parsedHarr,
        crownfit: parsedCrownFit,
      },
      paymentImages, // changed
      userName: user?.username || 'Unknown User',
      entryTotal: currentEntryTotal,
      timestamp: new Date().toISOString(),
      status: false,
    };
    console.log(selectedCustomer)

    const { success, errors } = await addEntry(newEntry, coordinates, address);
    if (!success && errors && errors.length > 0) {
        setErrorToast({ open: true, message: `Failed to upload: ${errors.join(' | ')}` });
    }

    // sendWhatsapp(newEntry, selectedCustomer?.phonenumber);

    resetPaymentInputs();
    setDescription('');
    dispatch(clearSelection({ key: 'recovery' }));

    searchInputRef.current?.focus();
  }, [
    selectedCustomer,
    cashAmount,
    jazzcashAmount,
    easypaisaAmount,
    crownWalletAmount,
    meezanBankAmount,
    onlineAmount,
    tcAmount,
    harrAmount,
    crownFitAmount,
    description,
    paymentImages, // changed
    user,
    addEntry,
    coordinates,
    address,
    resetPaymentInputs,
    dispatch,
  ]);

  // In the imports section, make sure you have:

  // Inside the RecoveryPaper component:
  const {
    expenseStateMap,
    currentTotalExpenses,
    submissionStatus,
    detailedResults,
    isSubmitting,
    handleSubmitExpenses,
    resetExpenseInputs,
  } = useExpenseInputs();

  // Update the handleSubmitAndReset function:
  const handleSubmitAndReset = async () => {
    setIsLoading(true)
    // Submit expenses
    const success = await handleSubmitExpenses(user);


    if (success) {
      // Reset all inputs and entries
      await screenshot();
      resetExpenseInputs();
      resetEntries();
      handleReset();
    } else {
      // Handle error case, maybe show a message to the user
      alert('Error submitting expenses. Please try again.');
    }
    setIsLoading(false)

  };

  const screenshot = async () => {
    if (!targetRef || !targetRef.current) return;

    setCapturing(true);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    await takeScreenShot(targetRef);
    setCapturing(false);
  };

  const isAddEntryDisabled = useMemo(() => {
    const parsedCash = parseFloat(cashAmount) || 0;
    const parsedJazzcash = parseFloat(jazzcashAmount) || 0;
    const parsedEasypaisa = parseFloat(easypaisaAmount) || 0;
    const parsedCrownWallet = parseFloat(crownWalletAmount) || 0;
    const parsedMeezanBank = parseFloat(meezanBankAmount) || 0;
    const parsedOnline = parseFloat(onlineAmount) || 0;
    const parsedTc = parseFloat(tcAmount) || 0;
    const parsedHarr = parseFloat(harrAmount) || 0;
    const parsedCrownFit = parseFloat(crownFitAmount) || 0;

    const currentEntryTotal =
      parsedCash +
      parsedJazzcash +
      parsedEasypaisa +
      parsedOnline +
      parsedCrownWallet +
      parsedMeezanBank +
      parsedTc +
      parsedHarr +
      parsedCrownFit;

    const paymentMethodsArr = [
      { amount: parsedCash, method: 'cash' },
      { amount: parsedJazzcash, method: 'jazzcash' },
      { amount: parsedEasypaisa, method: 'easypaisa' },
      { amount: parsedCrownWallet, method: 'crownWallet' },
      { amount: parsedMeezanBank, method: 'meezanBank' },
      { amount: parsedOnline, method: 'online' },
      { amount: parsedTc, method: 'tc' },
      { amount: parsedHarr, method: 'harr' },
      { amount: parsedCrownFit, method: 'crownfit' },
    ];

    const isDanish = user?.username?.toLowerCase().includes("danish");

    const missingRequiredImage = paymentMethodsArr.some(
      ({ amount, method }) => {
        if (amount <= 0) return false;
        if (method === 'cash') {
          return !isDanish && !paymentImages?.[method];
        }
        return !paymentImages?.[method];
      }
    );

    const hasImageWithoutAmount = paymentMethodsArr.some(
      ({ amount, method }) => amount <= 0 && !!paymentImages?.[method]
    );

    return (
      !selectedCustomer ||
      isLoading ||
      currentEntryTotal <= 0 ||
      missingRequiredImage ||
      hasImageWithoutAmount
    );
  }, [
    selectedCustomer,
    isLoading,
    loadingFinancials,
    cashAmount,
    jazzcashAmount,
    easypaisaAmount,
    crownWalletAmount,
    meezanBankAmount,
    onlineAmount,
    tcAmount,
    harrAmount,
    crownFitAmount,
    paymentImages, // changed
  ]);

  return (
    <Container
      maxWidth={'lg'}
      sx={{
        border: '1px solid #ccc',
        borderRadius: 2,
        bgcolor: '#fff',
        paddingBottom: 2,
      }}
    >
      <Box
        display="grid"
        justifyContent="center"
        alignItems="center"
        gap={2}
        gridTemplateColumns={{ xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)', lg: 'repeat(12, 1fr)' }}
      >
        <Typography
          variant="h5"
          component="h2"
          gutterBottom
          textAlign="start"
          sx={{ gridColumn: { xs: 'span 2', sm: 'span 6', lg: 'span 9' }, fontWeight: 'bold' }}
        >
          Recovery Entry
        </Typography>
        <TextField
          label="Route"
          variant="outlined"
          margin="normal"
          onFocus={(e) => e.target.select()}
          value={route}
          onChange={(e) => {
            setRoute(e.target.value.toUpperCase());
            handleReset();
          }}
          sx={{ 
            gridColumn: { xs: 'span 1', sm: 'span 3', lg: 'span 3' },
            backgroundColor: (route === '' || route === '0') ? '#f0f0f0' : 'white',
          }}
          inputProps={{
            style: { textTransform: 'uppercase', fontWeight: 'bold' },
          }}
        />
      </Box>

      <Stack spacing={2}>
        <CustomerSearchSection
          selectedCustomer={selectedCustomer}
          accountID={accountID}
          customerName={customerName}
          balance={balance}
          overDue={overDue}
          remainingBalance={remainingBalance}
          loadingFinancials={loadingFinancials}
          error={error}
          onFetchData={handleFetchData}
          onReset={handleReset}
          onLedgerClick={handleLedgerClick}
          searchInputRef={searchInputRef}
          route={route}
          description={description}
          setDescription={setDescription}
          showMore={showMore}
          setShowMore={setShowMore}
        />

        <PaymentInputsSection
          onAddEntry={handleAddEntry}
          cashAmount={cashAmount}
          jazzcashAmount={jazzcashAmount}
          onlineAmount={onlineAmount}
          easypaisaAmount={easypaisaAmount}
          crownWalletAmount={crownWalletAmount}
          tcAmount={tcAmount}
          harrAmount={harrAmount}
          crownFitAmount={crownFitAmount}
          meezanBankAmount={meezanBankAmount}
          paymentImages={paymentImages} // changed
          onCashAmountChange={handleCashAmountChange}
          onJazzcashAmountChange={handleJazzcashAmountChange}
          onOnlineAmountChange={handleOnlineAmountChange}
          onEasypaisaAmountChange={handleEasypaisaAmountChange}
          onCrownWalletAmountChange={handleCrownWalletAmountChange}
          onMeezanBankAmountChange={handleMeezanBankAmountChange}
          onTcAmountChange={handleTcAmountChange}
          onHarrAmountChange={handleHarrAmountChange}
          onCrownFitAmountChange={handleCrownFitAmountChange}
          onPaymentImageChange={handlePaymentImageChange} // changed
          showMore={showMore}
          cashInputRef={cashInputRef}
        />

        <FormActionsSection
          onAddEntry={handleAddEntry}
          onSubmitAndReset={handleSubmitAndReset}
          isAddEntryDisabled={isAddEntryDisabled}
          isLoading={isLoading}
          submitButtonDisabled={entries.filter(entry => entry.status === false).length > 0}
        />
      </Stack>

      <div ref={targetRef}>
        <TotalsDisplaySection
          totalCash={totalCash}
          totalAmount={totalAmount}
          totalJazzcash={totalJazzcash}
          totalEasypaisa={totalEasypaisa}
          totalCrownWallet={totalCrownWallet}
          totalMeezanBank={totalMeezanBank}
          totalTc={totalTc}
          totalHarr={totalHarr}
          currentTotalExpenses={currentTotalExpenses}
          user={user}
        />

        <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
          Entries ({entries.length}):
        </Typography>

        <EntriesListSection
          entries={entries}
          onRemove={handleRemoveEntry}
          onSyncOneEntry={(entry) => handleSyncOneEntry(entry, coordinates, address)}
        />

        {!user?.userType?.toLowerCase().includes('classic') && (
          <ExpenseInputsSection
            expenseStateMap={expenseStateMap}
            currentTotalExpenses={currentTotalExpenses}
            expenseKeys={expenseKeys}
            capturing={capturing}
            submissionStatus={submissionStatus}
            detailedResults={detailedResults}
          />
        )}
      </div>
      <Snackbar 
        open={errorToast.open} 
        autoHideDuration={15000} 
        onClose={() => setErrorToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorToast(prev => ({ ...prev, open: false }))} severity="error" sx={{ width: '100%', fontWeight: 'bold' }}>
          {errorToast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RecoveryPaper;