import React, { useState, useEffect } from "react";
import { DataTable } from "react-native-paper";
import { View, Text } from "react-native";

export default function Table({ data = [], headers = [] }) {
  const [page, setPage] = useState(0);
  const [itemsPerPageList] = useState([5, 10, 15]);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageList[0]);

  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, data.length);

  useEffect(() => {
    setPage(0);
  }, [itemsPerPage, data]);

  if (!data.length) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <Text>No data available</Text>
      </View>
    );
  }

  return (
    <DataTable>
      {/* Table Header */}
      <DataTable.Header
        style={{
          backgroundColor: "#26866F",
          borderRadius: 5,
        }}
      >
        {headers.map((header, index) => (
          <DataTable.Title key={index} numeric={header.numeric}>
            <Text style={{ color: "white", fontWeight: 100 }}>
              {header.label}
            </Text>
          </DataTable.Title>
        ))}
      </DataTable.Header>

      {/* Table Rows */}
      {data.slice(from, to).map((row, index) => (
        <DataTable.Row
          key={row.id ?? index}
          style={{ backgroundColor: "#ffffff" }}
        >
          {headers.map((header, i) => (
            <DataTable.Cell key={i} numeric={header.numeric}>
              {row[header.key]}
            </DataTable.Cell>
          ))}
        </DataTable.Row>
      ))}

      {/* Pagination */}
      <DataTable.Pagination
        page={page}
        numberOfPages={Math.ceil(data.length / itemsPerPage)}
        onPageChange={setPage}
        label={`${from + 1}-${to} of ${data.length}`}
        numberOfItemsPerPageList={itemsPerPageList}
        numberOfItemsPerPage={itemsPerPage}
        onItemsPerPageChange={(newItemsPerPage, newPage) => {
          setItemsPerPage(newItemsPerPage); // update items per page
          setPage(0); // reset page to 0 when rows per page changes
        }}
        showFastPaginationControls
        selectPageDropdownLabel="Rows per page"
      />
    </DataTable>
  );
}
