import { useState, useCallback } from 'react';

/**
 * Custom hook for managing form state
 * @param {Object} initialValues - Initial form values
 * @returns {Object} Form state and handlers
 */
export const useForm = (initialValues) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    setValues,
    errors,
    setErrors,
    handleChange,
    handleReset,
  };
};
