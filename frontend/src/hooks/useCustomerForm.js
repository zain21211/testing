import { useState } from "react";

export function useCustomerForm(initial = { name: "", email: "", phone: "" }) {
    const [form, setForm] = useState(initial);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const resetForm = () => setForm(initial);

    return { form, setForm, handleChange, resetForm };
}
