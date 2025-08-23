// src/components/ProductForm.jsx
import ErrorAlert from "./ErrorAlert";
import ProductSelectionGrid from "./ProductSelectionGrid";
import ProductDetailsGrid from "./ProductDetailsGrid";

export default function ProductForm(props) {
    const { error, setError, selectedProduct } = props;

    return (
        <>
            <ErrorAlert error={error} setError={setError} />
            <ProductSelectionGrid {...props} />
            {selectedProduct && <ProductDetailsGrid {...props} />}
        </>
    );
}
