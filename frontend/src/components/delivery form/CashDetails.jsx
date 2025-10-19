import { useState } from 'react';
import { useEntries } from '../../hooks/useEntries';
import { useExpenseInputs } from '../../hooks/useExpenseInputs';
import { TotalsDisplaySection } from '../recovery/TotalsDisplaySection'

import { Dialog } from "@mui/material";
import ExpenseInputsSection from '../recovery/ExpenseInputsSection';
import FormActionsSection from '../recovery/FormActionsSection';
const expenseKeys = ['petrol', 'toll', 'repair'];
const CashDetails = ({ open, onClose, cash, setCash }) => {
    const user = JSON.parse(localStorage.getItem('user'))
    const [capturing, setCapturing] = useState(false);

    const {
        entries,
        isLoading,
        totalAmount,
        // totalCash,
        totalJazzcash,
        totalEasypaisa,
        totalCrownWallet,
        totalMeezanBank,
        setIsLoading,
        resetEntries,
    } = useEntries();

    const {
        expenseStateMap,
        currentTotalExpenses,
        submissionStatus,
        detailedResults,
        isSubmitting,
        handleSubmitExpenses,
        resetExpenseInputs,
    } = useExpenseInputs();
    const handleSubmitAndReset = async () => {
        setIsLoading(true)
        // Submit expenses
        const success = await handleSubmitExpenses(user);


        if (success) {
            // Reset all inputs and entries
            //   await screenshot();
            resetExpenseInputs();
            resetEntries();
            setCash({})
            //   handleReset();
        } else {
            // Handle error case, maybe show a message to the user
            alert('Error submitting expenses. Please try again.');
        }
        setIsLoading(false)

    };
    const totalCash = cash ? Object.keys(cash).reduce((sum, key) => sum + cash[key], 0) : 0;

    return (
        <>
            <TotalsDisplaySection
                totalCash={totalCash}
                totalAmount={totalAmount}
                totalJazzcash={totalJazzcash}
                totalEasypaisa={totalEasypaisa}
                totalCrownWallet={totalCrownWallet}
                totalMeezanBank={totalMeezanBank}
                currentTotalExpenses={currentTotalExpenses}
            // user={user}
            />
            <ExpenseInputsSection
                expenseStateMap={expenseStateMap}
                currentTotalExpenses={currentTotalExpenses}
                expenseKeys={expenseKeys}
                capturing={capturing}
                submissionStatus={submissionStatus}
                detailedResults={detailedResults}
            />

            <FormActionsSection
                onSubmitAndReset={handleSubmitAndReset}
                isLoading={isLoading}
                form={'cashdetails'}
            />
        </>
    );
};

export default CashDetails;
