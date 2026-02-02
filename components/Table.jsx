import { View, Text, ScrollView } from "react-native";
import React, { useState, useEffect } from "react";
import { styles } from "../stylesheets/styles";
import Button from "./Button";
import { DataTable } from "react-native-paper";
export default function Table({ headers = [], data = [], columnWidths = {} }) {
  const [page, setPage] = useState(0);
  const [numberOfItemsPerPageList] = useState([5, 10, 15]);
  const [itemsPerPage, onItemsPerPageChange] = useState(
    numberOfItemsPerPageList[0],
  );
  const items = data;
  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, items.length);
  useEffect(() => {
    setPage(0);
  }, [itemsPerPage]);

  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    if (sortDirection === "asc") {
      return a[sortColumn] > b[sortColumn] ? 1 : -1;
    } else {
      return a[sortColumn] < b[sortColumn] ? 1 : -1;
    }
  });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
      <View>
        <DataTable>
          <DataTable.Header style={styles.tableHeader}>
            {headers.map((header, index) => (
              <DataTable.Title
                key={index}
                numeric={header.numeric}
                style={{ width: columnWidths[header.key] || 140 }}
                onPress={() => {
                  if (sortColumn === header.key) {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn(header.key);
                    setSortDirection("asc");
                  }
                }}
              >
                <Text style={styles.tableHeaderText}>{header.label}</Text>
              </DataTable.Title>
            ))}
          </DataTable.Header>
          {/* Table Rows */}
          {items.length === 0 ? (
            <DataTable.Row>
              <DataTable.Cell style={{ flex: 1 }}>
                <Text style={{ textAlign: "center", color: "gray" }}>
                  No data available
                </Text>
              </DataTable.Cell>
            </DataTable.Row>
          ) : (
            data.slice(from, to).map((row, index) => (
              <DataTable.Row
                key={row.id ?? index}
                style={{ backgroundColor: "#FFFFFF" }}
              >
                {/* Render other headers */}
                {headers.map((header, i) => (
                  <DataTable.Cell
                    key={i}
                    style={{ width: columnWidths[header.key] || 140 }}
                  >
                    {header.key === "actions" ? (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Button
                          iconName="edit"
                          label="Edit"
                          buttonStyle={{
                            width: 100,
                            borderRadius: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            backgroundColor: "#106ab4",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          buttonTextStyle={{
                            fontSize: 12,
                            color: "#fff",
                            textAlign: "center",
                          }}
                          onPress={() => console.log("Edit user:", row)}
                        />
                        <Button
                          iconName="cross"
                          label="Deactivate"
                          buttonStyle={{
                            width: 100,
                            borderRadius: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            backgroundColor: "#b41010",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          buttonTextStyle={{
                            fontSize: 12,
                            color: "#fff",
                            textAlign: "center",
                          }}
                          onPress={() => console.log("Deactivate user:", row)}
                        />
                      </View>
                    ) : header.key === "status" ? (
                      <View
                        style={[
                          {
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            alignItems: "center",
                            justifyContent: "center",
                          },
                          row[header.key] === "active"
                            ? styles.statusActive
                            : row[header.key] === "inactive"
                              ? styles.statusInactive
                              : row[header.key] === "deactivated"
                                ? styles.statusDeactivated
                                : null,
                        ]}
                      >
                        <Text style={{ color: "#000", fontWeight: "bold" }}>
                          {row[header.key] ?? "-"}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.tableCell}>
                        {row[header.key] ?? "-"}
                      </Text>
                    )}
                  </DataTable.Cell>
                ))}
              </DataTable.Row>
            ))
          )}

          <DataTable.Pagination
            page={page}
            numberOfPages={Math.ceil(items.length / itemsPerPage)}
            onPageChange={(page) => setPage(page)}
            label={`${from + 1}-${to} of ${items.length}`}
            numberOfItemsPerPageList={numberOfItemsPerPageList}
            numberOfItemsPerPage={itemsPerPage}
            onItemsPerPageChange={onItemsPerPageChange}
            showFastPaginationControls
            selectPageDropdownLabel={"Rows per page"}
          />
        </DataTable>
      </View>
    </ScrollView>
  );
}
