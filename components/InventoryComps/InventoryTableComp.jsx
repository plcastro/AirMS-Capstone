import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import { DataTable } from "react-native-paper";

import Button from "../Button";
import AlertComp from "../AlertComp";
import { styles } from "../../stylesheets/styles";

export default function InventoryTableComp({
  headers = [],
  data = [],
  columnWidths = {},
  onEditComponent,
  onDeleteComponent, // new prop
}) {
  const [page, setPage] = useState(0);
  const [itemsPerPageList] = useState([10, 15, 20]);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageList[0]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [componentToModify, setComponentToModify] = useState(null);

  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, data.length);

  useEffect(() => {
    setPage(0);
  }, [itemsPerPage]);

  // Sorting
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    const valA = a[sortColumn] ?? "";
    const valB = b[sortColumn] ?? "";
    if (sortDirection === "asc") return valA > valB ? 1 : -1;
    return valA < valB ? 1 : -1;
  });

  const confirmDelete = () => {
    if (componentToModify && onDeleteComponent) {
      onDeleteComponent(componentToModify.id);
    }
    setShowDeleteConfirm(false);
    setComponentToModify(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setComponentToModify(null);
  };

  // Layout
  const screenWidth = Dimensions.get("window").width;
  const totalWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
  const needsHorizontalScroll = totalWidth > screenWidth;

  const renderTable = () => (
    <View
      style={
        needsHorizontalScroll
          ? {}
          : {
              width: "100%",
              flexDirection: "row",
              maxWidth: "100%",
              minWidth: totalWidth,
            }
      }
    >
      <DataTable
        style={
          needsHorizontalScroll
            ? {}
            : {
                flex: 1,
                width: totalWidth,
                maxWidth: "100%",
                minWidth: totalWidth,
              }
        }
      >
        {/* Header */}
        <DataTable.Header style={styles.tableHeader}>
          {headers.map((header, i) => {
            const cellWidth = columnWidths[header.key] || 100;
            return (
              <DataTable.Title
                key={i}
                numeric={header.numeric}
                style={{
                  width: cellWidth,
                  flex: 0,
                  flexBasis: cellWidth,
                  flexShrink: 0,
                  minWidth: Math.max(cellWidth, 50),
                }}
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
            );
          })}
        </DataTable.Header>

        {/* Rows */}
        {sortedData.length === 0 ? (
          <DataTable.Row>
            <DataTable.Cell style={{ flex: 1 }}>
              <Text style={{ textAlign: "center", color: "gray" }}>
                No data available
              </Text>
            </DataTable.Cell>
          </DataTable.Row>
        ) : (
          sortedData.slice(from, to).map((row, idx) => (
            <DataTable.Row
              key={row.id ?? idx}
              style={{ backgroundColor: "#fff", textAlign: "center" }}
            >
              {headers.map((header, hIdx) => {
                const cellWidth = columnWidths[header.key] || 100;

                if (header.key === "actions") {
                  return (
                    <DataTable.Cell
                      key={hIdx}
                      style={{
                        width: cellWidth,
                        flex: 0,
                        flexBasis: cellWidth,
                        flexShrink: 0,
                        minWidth: Math.max(cellWidth, 50),
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "flex-start",
                        }}
                      >
                        <Button
                          iconName="edit"
                          buttonStyle={{
                            width: 50,
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 4,
                            backgroundColor: "#106ab4",
                            marginRight: 4,
                            alignItems: "center",
                          }}
                          buttonTextStyle={{
                            fontSize: 12,
                            color: "#fff",
                            textAlign: "center",
                          }}
                          onPress={() => onEditComponent(row)}
                        />
                        <Button
                          iconName="delete"
                          buttonStyle={{
                            width: 50,
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 4,
                            backgroundColor: "#cc0404",
                            marginRight: 4,
                            alignItems: "center",
                          }}
                          buttonTextStyle={{
                            fontSize: 12,
                            color: "#fff",
                            textAlign: "center",
                          }}
                          onPress={() => {
                            setComponentToModify(row);
                            setShowDeleteConfirm(true);
                          }}
                        />
                      </View>
                    </DataTable.Cell>
                  );
                }

                if (header.key === "stockLevel") {
                  const stockLevel = row.stockLevel?.toLowerCase();
                  let stockLevelColor = "#087e64";
                  if (stockLevel === "critical") stockLevelColor = "#b41010";
                  if (stockLevel === "low") stockLevelColor = "#ff9900";

                  return (
                    <DataTable.Cell
                      key={hIdx}
                      style={{
                        width: cellWidth,
                        flex: 0,
                        flexBasis: cellWidth,
                        flexShrink: 0,
                        minWidth: Math.max(cellWidth, 50),
                      }}
                    >
                      <View
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: stockLevelColor,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: 12,
                          }}
                        >
                          {stockLevel?.charAt(0).toUpperCase() +
                            stockLevel?.slice(1)}
                        </Text>
                      </View>
                    </DataTable.Cell>
                  );
                }

                return (
                  <DataTable.Cell
                    key={hIdx}
                    style={{
                      width: cellWidth,
                      flex: 0,
                      flexBasis: cellWidth,
                      flexShrink: 0,
                      minWidth: Math.max(cellWidth, 50),
                    }}
                  >
                    <Text style={styles.tableCell}>
                      {row[header.key] ?? "-"}
                    </Text>
                  </DataTable.Cell>
                );
              })}
            </DataTable.Row>
          ))
        )}

        {/* Pagination */}
        <DataTable.Pagination
          page={page}
          numberOfPages={Math.ceil(data.length / itemsPerPage)}
          onPageChange={(p) => setPage(p)}
          label={`${from + 1}-${to} of ${data.length}`}
          numberOfItemsPerPageList={itemsPerPageList}
          numberOfItemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          showFastPaginationControls
          selectPageDropdownLabel="Rows per page"
        />
      </DataTable>
    </View>
  );

  return (
    <View>
      {needsHorizontalScroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          {renderTable()}
        </ScrollView>
      ) : (
        renderTable()
      )}

      {/* Confirm Delete Alert */}
      {showDeleteConfirm && (
        <AlertComp
          visible={showDeleteConfirm}
          title="DELETE COMPONENT"
          message="Are you sure you want to delete this component?"
          type="confirm"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          confirmText="Yes, delete"
          cancelText="Cancel"
        />
      )}
    </View>
  );
}
