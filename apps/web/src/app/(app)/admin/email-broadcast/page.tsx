"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { Mail, Save, Send, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  htmlContent: string;
}

export default function AdminEmailBroadcastPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateLabel, setTemplateLabel] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] =
    useState<EmailTemplate | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const response =
          user?.role === "SUPER_ADMIN"
            ? await apiClient.getAllUsers()
            : await apiClient.getPracticeUsers();

        const normalized = (response as UserOption[]).filter(
          (item) => item.isActive && Boolean(item.email)
        );
        setUsers(normalized);
      } catch (error) {
        toast.error("Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [user?.role]);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = (await apiClient.getAdminEmailTemplates()) as EmailTemplate[];
        setTemplates(response);
      } catch {
        toast.error("Failed to load email templates");
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === "ALL" || u.role === roleFilter) &&
        (!query ||
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query))
    );
  }, [users, search, roleFilter]);

  const uniqueRoles = useMemo(() => {
    return ["ALL", ...new Set(users.map((u) => u.role))];
  }, [users]);

  const applyTemplate = () => {
    const template = templates.find((item) => item.id === selectedTemplate);
    if (!template) return;
    setTemplateId(template.id);
    setTemplateLabel(template.label);
    setSubject(template.subject);
    setHtmlContent(template.htmlContent);
    toast.success(`Template "${template.label}" applied`);
  };

  const loadTemplateToForm = (template: EmailTemplate) => {
    setSelectedTemplate(template.id);
    setTemplateId(template.id);
    setTemplateLabel(template.label);
    setSubject(template.subject);
    setHtmlContent(template.htmlContent);
  };

  const refreshTemplates = async () => {
    const response = (await apiClient.getAdminEmailTemplates()) as EmailTemplate[];
    setTemplates(response);
  };

  const saveTemplate = async () => {
    if (
      !templateId.trim() ||
      !templateLabel.trim() ||
      !subject.trim() ||
      !htmlContent.trim()
    ) {
      toast.error("Template ID, label, subject, and HTML content are required");
      return;
    }

    setSavingTemplate(true);
    try {
      await apiClient.createAdminEmailTemplate({
        id: templateId.trim(),
        label: templateLabel.trim(),
        subject,
        htmlContent,
      });
      await refreshTemplates();
      setSelectedTemplate(templateId.trim());
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const updateTemplate = async () => {
    if (
      !templateId.trim() ||
      !templateLabel.trim() ||
      !subject.trim() ||
      !htmlContent.trim()
    ) {
      toast.error("Template ID, label, subject, and HTML content are required");
      return;
    }

    setSavingTemplate(true);
    try {
      await apiClient.updateAdminEmailTemplate(templateId.trim(), {
        label: templateLabel.trim(),
        subject,
        htmlContent,
      });
      await refreshTemplates();
      toast.success("Template updated");
    } catch {
      toast.error("Failed to update template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const openDeleteConfirm = () => {
    const target = templates.find((t) => t.id === templateId.trim());
    if (!target) {
      toast.error("Select template first");
      return;
    }
    setPendingDeleteTemplate(target);
    setDeleteConfirmInput("");
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!pendingDeleteTemplate?.id) {
      return;
    }

    setSavingTemplate(true);
    try {
      await apiClient.deleteAdminEmailTemplate(pendingDeleteTemplate.id);
      await refreshTemplates();

      if (
        selectedTemplate === pendingDeleteTemplate.id ||
        templateId.trim() === pendingDeleteTemplate.id
      ) {
        setSelectedTemplate("");
        setTemplateId("");
        setTemplateLabel("");
      }

      toast.success("Template deleted");
      setDeleteConfirmOpen(false);
      setPendingDeleteTemplate(null);
    } catch {
      toast.error("Failed to delete template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const sendToAllFiltered = async () => {
    const filteredIds = filteredUsers.map((u) => u.id);
    if (!filteredIds.length || !subject.trim() || !htmlContent.trim()) {
      toast.error("Need filtered users, subject, and body");
      return;
    }
    setSelectedUserIds(filteredIds);
    setSending(true);
    try {
      const response = (await apiClient.sendAdminBroadcastEmail({
        userIds: filteredIds,
        subject,
        htmlContent,
      })) as {
        sent: number;
        failed: number;
        total: number;
      };

      if (response.failed > 0) {
        toast.error(
          `Sent to ${response.sent}/${response.total}. ${response.failed} failed.`
        );
      } else {
        toast.success(`Email sent to ${response.sent} filtered user(s).`);
      }
    } catch {
      toast.error("Failed to send email to filtered users");
    } finally {
      setSending(false);
    }
  };

  const clearSelection = () => setSelectedUserIds([]);

  const selectRoleUsers = (role: string) => {
    const ids =
      role === "ALL"
        ? users.map((u) => u.id)
        : users.filter((u) => u.role === role).map((u) => u.id);
    setSelectedUserIds(ids);
  };

  const filteredSelectedCount = filteredUsers.filter((u) =>
    selectedUserIds.includes(u.id)
  ).length;

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredUsers.map((u) => u.id);
    const allSelected = filteredIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handlePreview = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      toast.error("Subject and email body are required for preview");
      return;
    }
    setPreviewing(true);
    try {
      const response = (await apiClient.previewAdminEmailTemplate({
        subject,
        htmlContent,
      })) as { html: string };
      setPreviewHtml(response.html);
    } catch {
      toast.error("Failed to generate preview");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!selectedUserIds.length || !subject.trim() || !htmlContent.trim()) {
      toast.error("Select recipients and provide subject + email body");
      return;
    }

    setSending(true);
    try {
      const response = (await apiClient.sendAdminBroadcastEmail({
        userIds: selectedUserIds,
        subject,
        htmlContent,
      })) as {
        sent: number;
        failed: number;
        total: number;
      };

      if (response.failed > 0) {
        toast.error(
          `Sent to ${response.sent}/${response.total}. ${response.failed} failed.`
        );
      } else {
        toast.success(`Email sent to ${response.sent} user(s).`);
      }
    } catch (error) {
      toast.error("Failed to send broadcast email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Email Broadcast</h1>
        <p className="text-muted-foreground">
          Send templated emails to selected users with fixed header and footer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recipients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name/email/role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>
                  {role === "ALL" ? "All roles" : role}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={toggleSelectAllFiltered}>
              Toggle Filtered
            </Button>
            <Button variant="outline" onClick={clearSelection}>
              Clear Selection
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {uniqueRoles.map((role) => (
              <Button
                key={role}
                variant="outline"
                size="sm"
                onClick={() => selectRoleUsers(role)}
              >
                Select {role === "ALL" ? "All" : role}
              </Button>
            ))}
          </div>

          <div className="max-h-72 overflow-y-auto border border-border rounded-md">
            {loadingUsers ? (
              <div className="p-4 text-sm text-muted-foreground">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No users found.</div>
            ) : (
              filteredUsers.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center justify-between gap-3 p-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                    />
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{u.role}</Badge>
                </label>
              ))
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Selected recipients: {selectedUserIds.length} (in current filter:{" "}
            {filteredSelectedCount}/{filteredUsers.length})
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Saved Templates</Label>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  const template = templates.find((t) => t.id === e.target.value);
                  if (template) {
                    loadTemplateToForm(template);
                  } else {
                    setSelectedTemplate("");
                  }
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              onClick={applyTemplate}
              disabled={!selectedTemplate || loadingTemplates}
            >
              {loadingTemplates ? "Loading..." : "Apply Template"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Template ID</Label>
              <Input
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                placeholder="e.g. maintenance_notice"
              />
            </div>
            <div>
              <Label>Template Label</Label>
              <Input
                value={templateLabel}
                onChange={(e) => setTemplateLabel(e.target.value)}
                placeholder="e.g. Maintenance Notice"
              />
            </div>
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
            />
          </div>
          <div>
            <Label>HTML Content (Body only)</Label>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              rows={10}
              className="w-full p-3 rounded-md border border-border bg-background text-foreground"
              placeholder="<p>Hello, this is an important update...</p>"
            />
          </div>

          <div className="flex gap-2 justify-start">
            <Button
              variant="outline"
              onClick={saveTemplate}
              disabled={savingTemplate}
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Template
            </Button>
            <Button
              variant="outline"
              onClick={updateTemplate}
              disabled={savingTemplate || !templateId.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              Update Template
            </Button>
            <Button
              variant="outline"
              onClick={openDeleteConfirm}
              disabled={savingTemplate || !templateId.trim()}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Template
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={sendToAllFiltered}
              disabled={
                sending ||
                !filteredUsers.length ||
                !subject.trim() ||
                !htmlContent.trim()
              }
            >
              {sending ? "Sending..." : `Send to All Filtered (${filteredUsers.length})`}
            </Button>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={previewing || !subject.trim() || !htmlContent.trim()}
            >
              {previewing ? "Generating..." : "Preview"}
            </Button>
            <Button
              onClick={handleSend}
              disabled={
                sending ||
                !selectedUserIds.length ||
                !subject.trim() ||
                !htmlContent.trim()
              }
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : "Send Broadcast"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewHtml ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border border-border rounded-md p-3 bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>
      ) : null}

      {deleteConfirmOpen && pendingDeleteTemplate ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Delete Template
            </h3>
            <p className="text-sm text-muted-foreground">
              You are about to delete template{" "}
              <span className="font-medium text-foreground">
                {pendingDeleteTemplate.label}
              </span>{" "}
              (<code>{pendingDeleteTemplate.id}</code>).
            </p>

            {(selectedTemplate === pendingDeleteTemplate.id ||
              templateId.trim() === pendingDeleteTemplate.id) && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                Warning: this template is currently selected in the editor. Deleting
                it will clear selection and you may lose quick access.
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Type template ID to confirm deletion:{" "}
                <code>{pendingDeleteTemplate.id}</code>
              </Label>
              <Input
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Enter template ID exactly"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setPendingDeleteTemplate(null);
                  setDeleteConfirmInput("");
                }}
                disabled={savingTemplate}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteTemplate}
                disabled={
                  savingTemplate ||
                  deleteConfirmInput.trim() !== pendingDeleteTemplate.id
                }
                className="bg-red-600 hover:bg-red-700"
              >
                {savingTemplate ? "Deleting..." : "Yes, Delete Template"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
