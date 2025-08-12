"use client";

import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { ValidationMessage } from "@/components/ui/ValidationMessage";
import { useVideoCall } from "@/contexts/VideoCallContext";
import { apiClient } from "@/services/api";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  clientId: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface InstantCallFormData {
  title: string;
  description: string;
  caseId: string;
  participantIds: string[];
}

interface InstantCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (meetingId: string) => void;
  autoJoin?: boolean;
}

export default function InstantCallModal({
  isOpen,
  onClose,
  onSuccess,
  autoJoin = false,
}: InstantCallModalProps) {
  const { startVideoCall } = useVideoCall();
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pre-call settings
  const [preCallAudioEnabled, setPreCallAudioEnabled] = useState(true);
  const [preCallVideoEnabled, setPreCallVideoEnabled] = useState(true);

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    register,
    trigger,
    formState: { errors },
  } = useForm<InstantCallFormData>({
    defaultValues: {
      title: "",
      description: "",
      caseId: "",
      participantIds: [],
    },
    mode: "onSubmit",
  });

  // Watch for changes in participants to trigger validation
  const watchedParticipantIds = watch("participantIds");
  const participantError =
    watchedParticipantIds.length === 0
      ? { type: "required", message: "At least one participant is required" }
      : undefined;

  const watchedCaseId = watch("caseId");

  useEffect(() => {
    if (isOpen) {
      fetchCases();
      fetchUsers();
    }
  }, [isOpen]);

  const fetchCases = async () => {
    try {
      const data = await apiClient.getCases();
      setCases(data as Case[]);
    } catch (error) {
      console.error("Error fetching cases:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiClient.getClients();
      setUsers(data as User[]);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleInstantCallSubmit = async (data: InstantCallFormData) => {
    // Validate form before submission
    const isValid = await trigger();
    if (!isValid) {
      return;
    }

    // Additional validation
    if (data.participantIds.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }

    setIsLoading(true);

    try {
      const response = (await apiClient.startInstantCall(data)) as {
        meetingId: string;
      };

      // Save pre-call settings
      localStorage.setItem(
        "preCallAudioEnabled",
        preCallAudioEnabled.toString()
      );
      localStorage.setItem(
        "preCallVideoEnabled",
        preCallVideoEnabled.toString()
      );

      // Close modal and reset
      onClose();
      reset();

      // Start video call using context (same window)
      await startVideoCall(response.meetingId, data.title);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response.meetingId);
      }

      toast.success("Instant call started successfully!");
    } catch (error) {
      console.error("Error starting instant call:", error);
      toast.error("Failed to start instant call. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={handleCancel}
      header={
        <h2 className="text-lg font-semibold text-foreground">
          Start Instant Video Call
        </h2>
      }
      footer={
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="instantCallForm"
            disabled={
              isLoading ||
              !watch("title").trim() ||
              watch("participantIds").length === 0
            }
            className="px-6 py-2 cursor-pointer bg-orange-600 rounded-lg hover:bg-orange-700 focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
          >
            {isLoading ? "Starting..." : "Start Instant Call"}
          </button>
        </div>
      }
      maxWidth="lg"
    >
      <p className="text-sm text-muted-foreground mb-4">
        Start a video call immediately and notify participants. The call will
        begin right away.
      </p>

      <form
        id="instantCallForm"
        onSubmit={handleSubmit(handleInstantCallSubmit)}
      >
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="instantTitle"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Call Title{" "}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              id="instantTitle"
              {...register("title", { required: "Title is required" })}
              placeholder="Enter call title"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
            />
            <ValidationMessage error={errors.title} />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="instantDescription"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Description
            </label>
            <textarea
              id="instantDescription"
              {...register("description")}
              placeholder="Enter call description"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
            />
          </div>

          {/* Case Selection */}
          <div>
            <label
              htmlFor="instantCase"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Related Case
            </label>
            <CustomSelect
              options={[
                { value: "", label: "No case selected" },
                ...cases.map((caseItem) => ({
                  value: caseItem.id,
                  label: `${caseItem.caseNumber} - ${caseItem.title}`,
                })),
              ]}
              value={{
                value: watch("caseId"),
                label: watch("caseId")
                  ? cases.find((c) => c.id === watch("caseId"))?.caseNumber +
                    " - " +
                    cases.find((c) => c.id === watch("caseId"))?.title
                  : "No case selected",
              }}
              onChange={(option) => {
                const selectedCaseId = option?.value || "";
                const selectedCase = cases.find((c) => c.id === selectedCaseId);

                // Auto-add case client as participant if case is selected
                const updatedParticipantIds = [...watch("participantIds")];
                if (selectedCase && selectedCase.clientId) {
                  if (!updatedParticipantIds.includes(selectedCase.clientId)) {
                    updatedParticipantIds.push(selectedCase.clientId);
                  }
                }

                setValue("caseId", selectedCaseId);
                setValue("participantIds", updatedParticipantIds);
              }}
              placeholder="Select a case"
            />
            {watch("caseId") && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Case client will be automatically added as a participant
              </p>
            )}
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Participants{" "}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {users.map((user) => (
                <label key={user.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={watch("participantIds").includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setValue("participantIds", [
                          ...watch("participantIds"),
                          user.id,
                        ]);
                      } else {
                        setValue(
                          "participantIds",
                          watch("participantIds").filter((id) => id !== user.id)
                        );
                      }
                    }}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">
                    {user.name} ({user.email})
                  </span>
                </label>
              ))}
            </div>
            <ValidationMessage error={participantError} />
          </div>

          {/* Pre-call Settings */}
          <div className="border-t border-border pt-4">
            <h5 className="text-sm font-medium text-foreground mb-3">
              Pre-call settings:
            </h5>

            <div className="space-y-3">
              {/* Audio Setting */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  {preCallAudioEnabled ? (
                    <Mic className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <MicOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Microphone
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {preCallAudioEnabled
                        ? "Will be enabled"
                        : "Will be muted"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreCallAudioEnabled(!preCallAudioEnabled)}
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    preCallAudioEnabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800"
                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {preCallAudioEnabled ? "ON" : "OFF"}
                </button>
              </div>

              {/* Video Setting */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  {preCallVideoEnabled ? (
                    <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <VideoOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Camera
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {preCallVideoEnabled
                        ? "Will be enabled"
                        : "Will be turned off"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreCallVideoEnabled(!preCallVideoEnabled)}
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    preCallVideoEnabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800"
                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {preCallVideoEnabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}
