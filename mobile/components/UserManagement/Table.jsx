import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Dimensions, Alert } from "react-native";
import { DataTable } from "react-native-paper";

import Button from "../Button";
import AlertComp from "../AlertComp";
import { styles } from "../../stylesheets/styles";

export default function Table({
  headers = [],
  data = [],
  columnWidths = {},
  onEditUser,
  onDeactivateUser,
  onReactivateUser,
  currentUserId,
}) {
  const [page, setPage] = useState(0);
  const [itemsPerPageList] = useState([10, 15, 20]);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageList[0]);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
  const [userToModify, setUserToModify] = useState(null);

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

  // Confirm handlers
  const confirmDeactivate = () => {
    if (userToModify && onDeactivateUser) onDeactivateUser(userToModify);
    Alert.alert("User deactivated");
    setShowDeactivateConfirm(false);
    setUserToModify(null);
  };
  const confirmReactivate = () => {
    if (userToModify && onReactivateUser) onReactivateUser(userToModify);
    Alert.alert("User reactivated");
    setShowReactivateConfirm(false);
    setUserToModify(null);
  };
  const cancelModify = () => {
    setShowDeactivateConfirm(false);
    setShowReactivateConfirm(false);
    setUserToModify(null);
  };

  // Calculate total column width and screen width
  const screenWidth = Dimensions.get("window").width;
  const totalWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
  const needsHorizontalScroll = totalWidth > screenWidth;

  // Render the table content
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
            const cellWidth = columnWidths[header.key] || 100; // Fallback
            return (
              <DataTable.Title
                key={i}
                numeric={header.numeric}
                style={{
                  width: cellWidth,
                  flex: 0, // Prevent flex growth
                  flexBasis: cellWidth, // Enforce exact width
                  flexShrink: 0, // Prevent shrinking
                  minWidth: Math.max(cellWidth, 50), // Ensure minimum visibility
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
                const cellWidth = columnWidths[header.key] || 100; // Fallback

                // Actions column
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
                          label="Edit"
                          buttonStyle={{
                            width: 100,
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
                          onPress={() => onEditUser(row)}
                        />
                        {row.status === "deactivated" ? (
                          // Show Reactivate button for deactivated users
                          <Button
                            iconName="check"
                            label="Reactivate"
                            buttonStyle={{
                              width: 100,
                              borderRadius: 4,
                              paddingHorizontal: 6,
                              paddingVertical: 4,
                              backgroundColor: "#28a745",
                              alignItems: "center",
                            }}
                            buttonTextStyle={{
                              fontSize: 12,
                              color: "#fff",
                              textAlign: "center",
                            }}
                            onPress={() => {
                              setUserToModify(row);
                              setShowReactivateConfirm(true);
                            }}
                          />
                        ) : row.status === "active" &&
                          row._id !== currentUserId ? (
                          <Button
                            iconName="person-off"
                            label="Deactivate"
                            buttonStyle={{
                              width: 100,
                              borderRadius: 4,
                              paddingHorizontal: 6,
                              paddingVertical: 4,
                              backgroundColor: "#b41010",
                              alignItems: "center",
                            }}
                            buttonTextStyle={{
                              fontSize: 12,
                              color: "#fff",
                              textAlign: "center",
                            }}
                            onPress={() => {
                              setUserToModify(row);
                              setShowDeactivateConfirm(true);
                            }}
                          />
                        ) : null}
                      </View>
                    </DataTable.Cell>
                  );
                }

                // Status column
                if (header.key === "status") {
                  const statusStyle =
                    row.status === "active"
                      ? styles.statusActive
                      : row.status === "inactive"
                        ? styles.statusInactive
                        : row.status === "deactivated"
                          ? styles.statusDeactivated
                          : null;

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
                          paddingHorizontal: 4, // Reduced padding to fit 50px width
                          paddingVertical: 2,
                          borderRadius: 6,
                          alignItems: "center",
                          justifyContent: "center",
                          ...statusStyle,
                        }}
                      >
                        <Text
                          style={{
                            color: "#000",
                            fontWeight: "bold",
                            fontSize: 10,
                          }}
                        >
                          {row.status ?? "-"}
                        </Text>
                      </View>
                    </DataTable.Cell>
                  );
                }

                // Default cell
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

      {/* Confirm Alerts */}
      {(showDeactivateConfirm || showReactivateConfirm) && (
        <AlertComp
          visible={showDeactivateConfirm || showReactivateConfirm}
          title={showDeactivateConfirm ? "DEACTIVATE USER" : "REACTIVATE USER"}
          message={`Are you sure you want to ${
            showDeactivateConfirm ? "deactivate" : "reactivate"
          } this user?`}
          type="confirm"
          onConfirm={
            showDeactivateConfirm ? confirmDeactivate : confirmReactivate
          }
          onCancel={cancelModify}
          confirmText="YES"
          cancelText="CANCEL"
        />
      )}
    </View>
  );
}
