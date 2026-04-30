import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Button from "../Button";
import ReviewTask from "./ReviewTask";
import { styles } from "../../stylesheets/styles";
import CheckBox from "../CheckBox";
import { showToast } from "../../utilities/toast";
import { COLORS } from "../../stylesheets/colors";

export default function TaskChecklist({
  visible,
  onClose,
  task,
  onStartTask,
  onSaveDraft,
  onTurnIn,
  onApprove,
  onReturn,
  isHeadView = false,
}) {
  const [checklistState, setChecklistState] = useState([]);
  const [findings, setFindings] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewMode, setReviewMode] = useState("return");

  useEffect(() => {
    if (task?.checklistItems) {
      const normalizedChecklistState = task.checklistItems.map((_, index) => {
        if (Array.isArray(task.checklistState)) {
          return task.checklistState[index] === true;
        }

        if (
          task.status === "Completed" ||
          task.status === "Turned in" ||
          task.status === "Approved"
        ) {
          return true;
        }

        return false;
      });

      setChecklistState(normalizedChecklistState);

      if (
        task.status === "Completed" ||
        task.status === "Turned in" ||
        task.status === "Approved"
      ) {
        setIsStarted(true);
      } else {
        setIsStarted(task.status === "Ongoing" || task.status === "Returned");
      }

      setFindings(task.findings || "");
    }
  }, [task]);

  const toggleItem = (index) => {
    if (!isStarted || isHeadView) return;
    if (
      task.status === "Completed" ||
      task.status === "Turned in" ||
      task.status === "Approved"
    ) {
      return;
    }

    const updated = [...checklistState];
    updated[index] = !updated[index];
    setChecklistState(updated);
  };

  const handleStartTask = () => {
    if (isHeadView) return;
    setIsStarted(true);
    onStartTask?.(task);
  };

  const handleSave = async () => {
    if (isHeadView) return;
    await onSaveDraft?.(task, checklistState, findings);
    onClose();
  };

  const handleTurnIn = async (options = {}) => {
    if (isHeadView) return;

    if (options.undo) {
      await onTurnIn?.(task, checklistState, findings, {
        undo: true,
        newStatus: "Ongoing",
      });
    } else {
      if (!allCheckboxesChecked) {
        showToast("Please check all checklist items before turning in the task.");
        return;
      }

      await onTurnIn?.(task, checklistState, findings);
    }

    onClose();
  };

  const handleReturnConfirm = async ({ note, signature, itemsToUncheck }) => {
    await onReturn?.(task, { comments: note, signature, itemsToUncheck });
    setShowReviewModal(false);
    onClose();
  };

  const handleApproveConfirm = async ({ signature }) => {
    await onApprove?.(task, { signature });
    setShowReviewModal(false);
    onClose();
  };

  const handleReviewCancel = () => {
    setShowReviewModal(false);
  };

  const openReturnModal = () => {
    setReviewMode("return");
    setShowReviewModal(true);
  };

  const openApproveModal = () => {
    setReviewMode("approve");
    setShowReviewModal(true);
  };

  if (!task) return null;

  const checklistItems = Array.isArray(task.checklistItems)
    ? task.checklistItems
    : [];

  const isReturned = task.status === "Returned";
  const isTurnedIn = task.status === "Turned in";
  const isCompleted =
    task.status === "Completed" ||
    task.status === "Turned in" ||
    task.status === "Approved";

  const isApproved = task.isApproved || task.status === "Approved" || false;
  const approvedBy = task.approvedBy || "";
  const approvedDate = task.approvedAt || task.approvedDate || "";
  const approvedSignature = task.approvedSignature || "";

  const allCheckboxesChecked =
    checklistItems.length > 0 &&
    checklistItems.every((_, index) => checklistState[index] === true);

  const formatScheduleDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${formattedDate} ${formattedTime}`;
  };

  const formatReturnedDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${formattedDate} at ${formattedTime}`;
  };

  const renderChecklistTitle = (item, isDisabled) => {
    if (isHeadView) {
      return item.taskName;
    }

    const checklistMeta = [item.taskId, item.inspectionTypeFull]
      .filter(Boolean)
      .join(" | ");

    return (
      <View>
        {!!checklistMeta && (
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: isDisabled ? "#999" : "#666",
              marginBottom: 2,
            }}
          >
            {checklistMeta}
          </Text>
        )}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: isDisabled ? "#999" : "#000",
            marginBottom: item.description ? 2 : 0,
          }}
        >
          {item.taskName}
        </Text>
        {!!item.documentation && (
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: isDisabled ? "#999" : "#4f6b66",
              marginBottom: item.description ? 2 : 0,
            }}
          >
            AMM: {item.documentation}
          </Text>
        )}
        {!!item.description && (
          <Text
            style={{
              fontSize: 12,
              lineHeight: 18,
              color: isDisabled ? "#999" : "#555",
            }}
          >
            {item.description}
          </Text>
        )}
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible && !showReviewModal}
        animationType="none"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View
            style={{
              maxWidth: "95%",
              width: 600,
              maxHeight: "90%",
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: 24,
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close task details"
              activeOpacity={0.75}
              onPress={onClose}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                zIndex: 2,
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f5f5f5",
              }}
            >
              <MaterialCommunityIcons
                name="close"
                size={22}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                marginBottom: 6,
                marginRight: 42,
              }}
            >
              {task.title}
            </Text>

            <Text style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>
              End {formatScheduleDateTime(task.endDateTime || task.dueDate)} |
              {" "}Aircraft {task.aircraft}
            </Text>

            {isHeadView && isReturned && (
              <View
                style={{
                  backgroundColor: "#ffebee",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: "#ffcdd2",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#c62828",
                    marginBottom: 4,
                  }}
                >
                  Returned for Rework
                </Text>
                {task.returnComments && (
                  <Text style={{ fontSize: 12, color: "#b71c1c" }}>
                    {task.returnComments}
                  </Text>
                )}
              </View>
            )}

            {isReturned && !isHeadView && (
              <View
                style={{
                  backgroundColor: "#ffebee",
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: "#ffcdd2",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#c62828",
                    marginBottom: 8,
                  }}
                >
                  Remarks
                </Text>
                <Text
                  style={{ fontSize: 12, color: "#b71c1c", marginBottom: 12 }}
                >
                  {task.returnComments ||
                    "Finding details are incomplete. Please update findings."}
                </Text>
                <Text style={{ fontSize: 12, color: "#e57373" }}>
                  Returned on{" "}
                  {formatReturnedDateTime(
                    task.returnedAt || task.returnedDate || new Date(),
                  )}
                </Text>
              </View>
            )}

            {isCompleted && (
              <View
                style={{
                  backgroundColor: "#e8f5e9",
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: "#c8e6c9",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#2e7d32",
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      OK
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#2e7d32",
                      fontWeight: "600",
                    }}
                  >
                    Task Completed
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#fff",
                    padding: 12,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: "#c8e6c9",
                  }}
                >
                  <Text
                    style={{ fontSize: 12, color: "#555", marginBottom: 4 }}
                  >
                    Approval Status:
                  </Text>
                  {isApproved ? (
                    <View>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#2e7d32",
                          fontWeight: "600",
                          marginBottom: 2,
                        }}
                      >
                        Approved
                      </Text>
                      <Text style={{ fontSize: 12, color: "#666" }}>
                        {approvedDate
                          ? `Approved by ${approvedBy || "Maintenance Manager"} on ${formatReturnedDateTime(approvedDate)}`
                          : `Approved by ${approvedBy || "Maintenance Manager"}`}
                      </Text>
                      {!!approvedSignature && (
                        <View
                          style={{
                            borderWidth: 1,
                            borderColor: "#c8e6c9",
                            borderRadius: 6,
                            height: 70,
                            marginTop: 10,
                            backgroundColor: "#fff",
                            justifyContent: "center",
                          }}
                        >
                          <Image
                            source={{ uri: approvedSignature }}
                            style={{ width: "100%", height: "100%", resizeMode: "contain" }}
                          />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#f57c00",
                          fontWeight: "600",
                          marginBottom: 2,
                        }}
                      >
                        Pending Approval
                      </Text>
                      <Text style={{ fontSize: 12, color: "#666" }}>
                        Pending review by Maintenance Manager
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <ScrollView
              style={{ marginBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 12}}
              >
                Checklist
              </Text>

              {checklistItems.map((item, index) => {
                const isDisabled = !isStarted || isCompleted || isHeadView;

                return (
                  <View key={index} style={{ marginBottom: 10 }}>
                    <CheckBox
                      title={renderChecklistTitle(item, isDisabled)}
                      value={checklistState[index]}
                      onValueChange={() => toggleItem(index)}
                      checkboxStyle={styles.checkBox}
                      disabled={isDisabled}
                      textStyle={isDisabled ? { color: "#999" } : {}}
                      checkboxColor={isDisabled ? "#ccc" : undefined}
                    />
                  </View>
                );
              })}

              {!isHeadView && isStarted && (
                <>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      marginTop: 20,
                      marginBottom: 12,
                    }}
                  >
                    Findings (AI-interpreted)
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#667085",
                      marginBottom: 10,
                      lineHeight: 18,
                    }}
                  >
                    These findings are used by the AI maintenance tracker. Include symptoms, affected components, inspection results, and corrective details when available.
                  </Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "#e0e0e0",
                      borderRadius: 8,
                      backgroundColor: isCompleted ? "#f5f5f5" : "#fff",
                      marginBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        borderBottomWidth: 1,
                        borderBottomColor: "#e0e0e0",
                        padding: 12,
                        backgroundColor: "#f5f5f5",
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "600",
                          fontSize: 12,
                          color: "#333",
                        }}
                      >
                        Findings
                      </Text>
                    </View>
                    <TextInput
                      style={{
                        minHeight: 100,
                        padding: 12,
                        fontSize: 12,
                        textAlignVertical: "top",
                        color: isCompleted ? "#666" : "#000",
                      }}
                      multiline
                      value={findings}
                      onChangeText={setFindings}
                      placeholder="Enter findings, symptoms, affected parts, and inspection results here..."
                      placeholderTextColor="#999"
                      editable={!isCompleted || isReturned}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              {isHeadView && isTurnedIn && !isApproved ? (
                <>
                  <Button
                    label="Return"
                    onPress={openReturnModal}
                    buttonStyle={[styles.dangerBtn, { width: 120 }]}
                    buttonTextStyle={styles.primaryBtnTxt}
                  />
                  <Button
                    label="Approve"
                    onPress={openApproveModal}
                    buttonStyle={[styles.primaryAlertBtn, { width: 120 }]}
                    buttonTextStyle={styles.primaryBtnTxt}
                  />
                </>
              ) : isHeadView && isApproved ? null : isHeadView ? (
                <Button
                  label="Close"
                  onPress={onClose}
                  buttonStyle={[styles.secondaryAlertBtn, { width: 100 }]}
                  buttonTextStyle={styles.secondaryBtnTxt}
                />
              ) : isCompleted ? (
                <>
                  <Button
                    label="Undo Turn In"
                    onPress={() => handleTurnIn({ undo: true })}
                    buttonStyle={[styles.primaryAlertBtn, { width: 120 }]}
                    buttonTextStyle={styles.primaryBtnTxt}
                  />
                </>
              ) : (
                <>

                  {!isStarted ? (
                    <Button
                      label="Start Task"
                      onPress={handleStartTask}
                      buttonStyle={[styles.primaryAlertBtn, { width: 100 }]}
                      buttonTextStyle={styles.primaryBtnTxt}
                    />
                  ) : (
                    <Button
                      label={allCheckboxesChecked ? "Turn in" : "Save"}
                      onPress={
                        allCheckboxesChecked ? () => handleTurnIn() : handleSave
                      }
                      buttonStyle={[styles.primaryAlertBtn, { width: 100 }]}
                      buttonTextStyle={styles.primaryBtnTxt}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <ReviewTask
        visible={showReviewModal}
        onClose={handleReviewCancel}
        onConfirm={
          reviewMode === "return" ? handleReturnConfirm : handleApproveConfirm
        }
        mode={reviewMode}
        checklistItems={checklistItems}
        checklistState={checklistState}
      />
    </>
  );
}
