import { View, ScrollView, Text } from "react-native";
import React, { useState, useEffect } from "react";
import { styles } from "../../stylesheets/styles";
import { DataTable } from "react-native-paper";
import Button from "../Button";

export default function MaintenanceTable({
  headers = [],
  data = [],
  columnWidths = {},
  onEditEntry,
}) {
  const [page, setPage] = useState(0);
  const [numberOfItemsPerPageList] = useState([5, 10, 15, 20]);
  const [itemsPerPage, onItemsPerPageChange] = useState(
    numberOfItemsPerPageList[0],
  );

  const items = data;
  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, items.length);

  useEffect(() => {
    setPage(0);
  }, [itemsPerPage]);

  const getStatusStyle = (status) => {
    switch (status) {
      case "Verified":
        return styles.maintenanceStatusVerified;
      case "Unverified":
        return styles.maintenanceStatusUnverified;
      default:
        return styles.maintenanceStatusUnverified;
    }
  };

  const formatCellContent = (value) => {
    if (!value || value === "N/A") return "N/A";
    if (value === "") return "";
    return value;
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text || text === "N/A") return "N/A";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={{ width: "100%" }}>
          <DataTable>
            <DataTable.Header style={styles.maintenanceTableHeader}>
              {headers.map((header, index) => (
                <DataTable.Title
                  key={index}
                  numeric={header.numeric}
                  style={{
                    width: columnWidths[header.key] || 140,
                    justifyContent: "center",
                    paddingVertical: 8,
                  }}
                >
                  <Text style={styles.maintenanceTableHeaderText}>
                    {header.label}
                  </Text>
                </DataTable.Title>
              ))}
            </DataTable.Header>

            {items.length === 0 ? (
              <DataTable.Row>
                <DataTable.Cell style={{ flex: 1, paddingVertical: 20 }}>
                  <Text style={{ textAlign: "center", color: "gray" }}>
                    No maintenance records found
                  </Text>
                </DataTable.Cell>
              </DataTable.Row>
            ) : (
              data.slice(from, to).map((row, index) => (
                <DataTable.Row
                  key={row.id ?? index}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F9F9F9",
                    minHeight: 48,
                  }}
                >
                  {headers.map((header, i) => (
                    <DataTable.Cell
                      key={i}
                      style={{
                        width: columnWidths[header.key] || 140,
                        paddingVertical: 8,
                        justifyContent: "center",
                      }}
                    >
                      {header.key === "action" ? (
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "center",
                          }}
                        >
                          <Button
                            iconName="edit"
                            label="Edit"
                            buttonStyle={{
                              minWidth: 70,
                              borderRadius: 4,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              backgroundColor: "#106ab4",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            buttonTextStyle={{
                              fontSize: 12,
                              color: "#fff",
                              textAlign: "center",
                              fontWeight: "500",
                            }}
                            onPress={() => onEditEntry(row)}
                          />
                        </View>
                      ) : header.key === "status" ? (
                        <View
                          style={[
                            {
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 6,
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 90,
                            },
                            getStatusStyle(row[header.key]),
                          ]}
                        >
                          <Text
                            style={{
                              color: "#000",
                              fontWeight: "600",
                              fontSize: 12,
                              textAlign: "center",
                            }}
                          >
                            {row[header.key] || "Unverified"}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.maintenanceTableCell,
                            {
                              textAlign:
                                header.key === "aircraft" ? "center" : "left",
                              ...(header.key === "defects" && {
                                maxWidth: columnWidths[header.key] - 20,
                                flexWrap: "wrap",
                              }),
                            },
                          ]}
                        >
                          {header.key === "defects" ||
                          header.key === "correctiveActionDone"
                            ? truncateText(row[header.key], 80)
                            : formatCellContent(row[header.key])}
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
              style={{ paddingVertical: 8 }}
            />
          </DataTable>
        </View>
      </ScrollView>
    </View>
  );
}
