// src/hooks/useFilterAutocomplete.js
import { useMemo } from "react";

function makeWildcardRegex(input) {
    try {
        const pattern = input
            .toLowerCase()
            .replace(/\*/g, ".*") // * as wildcard
            .replace(/\?/g, ".") // ? as single char
            .replace(/%/g, ".*"); // % → .* (multi-char wildcard)
        return new RegExp(pattern);
    } catch {
        return null; // invalid regex
    }
}

/**
 * Generic autocomplete filtering hook
 * 
 * @param {Array} products - Product list
 * @param {Object} options - filters + configs
 * @param {string} options.companyFilter - filter by company (wildcard)
 * @param {string} options.categoryFilter - filter by category/model (wildcard)
 * @param {string} options.productInputValue - search input
 * @param {string|number} options.productID - selected product ID
 * @param {boolean} options.initialDataLoading - loading flag
 */
export function useFilterAutocomplete(
    products,
    {
        companyFilter = "",
        categoryFilter = "",
        productInputValue = "",
        productID = "",
        initialDataLoading = false,
    }
) {
    const filteredOptions = useMemo(() => {
        if (initialDataLoading) return [];

        let filtered = [...products];

        // Filter by Company (must start with input)
        if (companyFilter?.trim()) {
            const companyRegex = new RegExp("^" + companyFilter.toLowerCase());
            filtered = filtered.filter(
                (p) => p.Company && companyRegex.test(p.Company.toLowerCase())
            );
        }

        // Filter by Category/Model
        if (categoryFilter?.trim()) {
            const categoryRegex = makeWildcardRegex(categoryFilter);
            if (categoryRegex) {
                filtered = filtered.filter(
                    (p) => p.Category && categoryRegex.test(p.Category.toLowerCase())
                );
            } else {
                return []; // Invalid pattern
            }
        }

        // Filter by product name input
        if (productInputValue?.trim() && !productID) {
            const nameRegex = makeWildcardRegex(productInputValue);
            if (nameRegex) {
                filtered = filtered
                    .filter((p) => (p.Name && nameRegex.test(p.Name.toLowerCase())) || (p.UrduName && nameRegex.test(p.UrduName.toLowerCase())))
                    .slice(0, 8);
            } else {
                return []; // Invalid pattern
            }
        } else if (productID) {
            filtered = products.filter((p) => String(p.ID) === String(productID) || String(p.code) === String(productID));
        }

        return filtered;
    }, [
        products,
        companyFilter,
        categoryFilter,
        productInputValue,
        initialDataLoading,
        productID,
    ]);

    return filteredOptions;
}
