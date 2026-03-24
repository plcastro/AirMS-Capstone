import React, { useState, useEffect } from "react";
import { View, Text, Modal, ScrollView, TextInput } from "react-native";
import Button from "../Button";
import ReviewTask from "./ReviewTask";
import { styles } from "../../stylesheets/styles";
import CheckBox from "../CheckBox";

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
      if (task.checklistState) {
        setChecklistState(task.checklistState);
      } else if (
        task.status === "Completed" ||
        task.status === "Turned in" ||
        task.status === "Approved"
      ) {
        setChecklistState(task.checklistItems.map(() => true));
      } else {
        setChecklistState(task.checklistItems.map(() => false));
      }

      if (
        task.status === "Completed" ||
        task.status === "Turned in" ||
        task.status === "Approved"
      ) {
        setIsStarted(true);
      } else {
        setIsStarted(task.status === "Ongoing" || task.status === "Returned");
      }

      if (task.findings) {
        setFindings(task.findings);
      } else {
        setFindings("");
      }
    }
  }, [task]);

  const toggleItem = (index) => {
    if (!isStarted || isHeadView) return;
    if (
      task.status === "Completed" ||
      task.status === "Turned in" ||
      task.status === "Approved"
    )
      return;

    const updated = [...checklistState];
    updated[index] = !updated[index];
    setChecklistState(updated);
  };

  const handleStartTask = () => {
    if (isHeadView) return;
    setIsStarted(true);
    onStartTask?.(task);
  };

  const handleSave = () => {
    if (isHeadView) return;
    onSaveDraft?.(task, checklistState, findings);
    onClose();
  };

  const handleTurnIn = (options = {}) => {
    if (isHeadView) return;

    if (options.undo) {
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      const isPastDue = dueDate < now;
      const newStatus = isPastDue ? "Ongoing" : "Ongoing";

      onTurnIn?.(task, checklistState, findings, {
        undo: true,
        newStatus,
      });
    } else {
      onTurnIn?.(task, checklistState, findings);
    }
    onClose();
  };

  const handleReturnConfirm = ({ note, signature }) => {
    onReturn?.(task, { comments: note, signature });
    setShowReviewModal(false);
    onClose();
  };

  const handleApproveConfirm = ({ signature }) => {
    onApprove?.(task, { signature });
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

  const isPending = task.status === "Pending";
  const isReturned = task.status === "Returned";
  const isOngoing = task.status === "Ongoing";
  const isTurnedIn = task.status === "Turned in";
  const isCompleted =
    task.status === "Completed" ||
    task.status === "Turned in" ||
    task.status === "Approved";

  const isApproved = task.isApproved || false;
  const approvedBy = task.approvedBy || "John Smith";
  const approvedDate = task.approvedDate || "Mar 04, 2026 at 2:30 PM";

  const allCheckboxesChecked =
    checklistState.every((item) => item === true) && checklistState.length > 0;

  const formatDueDateTime = (dateString) => {
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
            {/* Task Title */}
            <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 6 }}>
              {task.title}
            </Text>

            {/* Due Date with Time and Aircraft */}
            <Text style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
              Due {formatDueDateTime(task.dueDate)} | Aircraft {task.aircraft}
            </Text>

            {/* For head view - Show Approve/Return buttons on To Be Reviewed tasks */}
            {isHeadView && isTurnedIn && !isApproved && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <Button
                  label="Return Task"
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
              </View>
            )}

            {/* Returned for Rework message */}
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
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#c62828",
                    marginBottom: 4,
                  }}
                >
                  Returned for Rework
                </Text>
                {task.returnComments && (
                  <Text style={{ fontSize: 14, color: "#b71c1c" }}>
                    {task.returnComments}
                  </Text>
                )}
              </View>
            )}

            {/* Returned Badge and Info (if applicable) for mechanic view */}
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
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#c62828",
                    marginBottom: 8,
                  }}
                >
                  Remarks
                </Text>
                <Text
                  style={{ fontSize: 14, color: "#b71c1c", marginBottom: 12 }}
                >
                  {task.returnComments ||
                    "Finding details are incomplete. Please update findings."}
                </Text>
                <Text style={{ fontSize: 12, color: "#e57373" }}>
                  Returned on{" "}
                  {formatReturnedDateTime(task.returnedDate || new Date())}
                </Text>
              </View>
            )}

            {/* Completed Badge and Approval Status (if applicable) */}
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
                        fontSize: 14,
                        fontWeight: "bold",
                      }}
                    >
                      ✓
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      color: "#2e7d32",
                      fontWeight: "600",
                    }}
                  >
                    Task Completed
                  </Text>
                </View>

                {/* Approval Status */}
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
                    style={{ fontSize: 14, color: "#555", marginBottom: 4 }}
                  >
                    Approval Status:
                  </Text>
                  {isApproved ? (
                    <View>
                      <Text
                        style={{
                          fontSize: 16,
                          color: "#2e7d32",
                          fontWeight: "600",
                          marginBottom: 2,
                        }}
                      >
                        ✓ Approved
                      </Text>
                      <Text style={{ fontSize: 13, color: "#666" }}>
                        Approved by {approvedBy} on {approvedDate}
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text
                        style={{
                          fontSize: 16,
                          color: "#f57c00",
                          fontWeight: "600",
                          marginBottom: 2,
                        }}
                      >
                        ⏳ Not Yet Approved
                      </Text>
                      <Text style={{ fontSize: 13, color: "#666" }}>
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
              {/* Checklist Section */}
              <Text
                style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}
              >
                Checklist
              </Text>

              {task.checklistItems.map((item, index) => {
                // Determine if this item should be grayed out
                const isDisabled = !isStarted || isCompleted || isHeadView;

                return (
                  <View key={index} style={{ marginBottom: 10 }}>
                    <CheckBox
                      title={item.taskName}
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

              {/* Findings Section - ONLY for mechanic view, NEVER for head view */}
              {!isHeadView && isStarted && (
                <>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      marginTop: 20,
                      marginBottom: 12,
                    }}
                  >
                    Findings
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
                          fontSize: 14,
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
                        fontSize: 14,
                        textAlignVertical: "top",
                        color: isCompleted ? "#666" : "#000",
                      }}
                      multiline
                      value={findings}
                      onChangeText={setFindings}
                      placeholder="Enter your findings here..."
                      placeholderTextColor="#999"
                      editable={!isCompleted || isReturned}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            {/* Buttons */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              {isHeadView ? (
                <Button
                  label="Close"
                  onPress={onClose}
                  buttonStyle={[styles.primaryAlertBtn, { width: 100 }]}
                  buttonTextStyle={styles.primaryBtnTxt}
                />
              ) : isCompleted ? (
                <>
                  <Button
                    label="Close"
                    onPress={onClose}
                    buttonStyle={[styles.secondaryBtn, { width: 100 }]}
                    buttonTextStyle={styles.secondaryBtnTxt}
                  />
                  <Button
                    label="Undo Turn In"
                    onPress={() => handleTurnIn({ undo: true })}
                    buttonStyle={[styles.neutralBtn, { width: 120 }]}
                    buttonTextStyle={styles.primaryBtnTxt}
                  />
                </>
              ) : (
                <>
                  <Button
                    label="Cancel"
                    onPress={onClose}
                    buttonStyle={[styles.secondaryBtn, { width: 100 }]}
                    buttonTextStyle={styles.secondaryBtnTxt}
                  />

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

      {/* Review Modal - handles both Return and Approve */}
      <ReviewTask
        visible={showReviewModal}
        onClose={handleReviewCancel}
        onConfirm={
          reviewMode === "return" ? handleReturnConfirm : handleApproveConfirm
        }
        mode={reviewMode}
      />
    </>
  );
}
