// src/pages/SearchPage.tsx
import React, { useState } from "react";
import { Box, Table, Button, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Link } from "react-router-dom";

interface SearchResults {
  id: number;
  companyName: string;
  companyIdentifier: string;
  solutionApiProdUrl: string;
  solutionApiDevUrl: string;
  email: string;
}

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults[]>([]);

  const handleSearch = async () => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_DIRECTORY_API_URL
        }/companies/search?searchQuery=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error fetching search results:", error);
    }
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      await handleSearch();
    }
  };

  const handleSearchInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { value } = event.target;
    setSearchQuery(value);
  };

  return (
    <Box
      style={{
        padding: "20px",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <h2>Search Companies</h2>
      <Box
        p={"2"}
        style={{
          display: "flex",
          marginBottom: "20px",
        }}
      >
        <TextField.Root
          placeholder="Search by company name"
          onChange={handleSearchInputChange}
          onKeyDown={handleKeyDown}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
        <Button ml="2" onClick={handleSearch}>
          Search
        </Button>
      </Box>
      {searchResults.length > 0 && (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Company Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>
                Company Identifier
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>
                Solution API Prod URL
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>
                Solution API Dev URL
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {searchResults.map((result) => (
              <Table.Row key={result.id}>
                <Table.Cell>
                  <Link to={`/company/${result.id}`}>{result.companyName}</Link>
                </Table.Cell>
                <Table.Cell>{result.companyIdentifier}</Table.Cell>
                <Table.Cell>{result.solutionApiProdUrl}</Table.Cell>
                <Table.Cell>{result.solutionApiDevUrl}</Table.Cell>
                <Table.Cell>{result.email}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Box>
  );
};

export default SearchPage;
