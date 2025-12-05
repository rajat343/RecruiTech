import axios from "axios";

const GRAPHQL_URL =
	import.meta.env.VITE_GRAPHQL_URL || "http://localhost:4000/graphql";

/**
 * Execute a GraphQL query or mutation
 * @param {string} query - The GraphQL query/mutation string
 * @param {object} variables - Variables for the query/mutation
 * @param {string} token - Optional authentication token
 * @returns {Promise} - Response data
 */
export const graphqlRequest = async (query, variables = {}, token = null) => {
	const headers = {
		"Content-Type": "application/json",
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await axios.post(
		GRAPHQL_URL,
		{
			query,
			variables,
		},
		{ headers }
	);

	if (response.data.errors) {
		throw new Error(response.data.errors[0].message);
	}

	return response.data.data;
};
