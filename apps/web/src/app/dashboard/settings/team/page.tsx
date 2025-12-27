"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, Trash2, Mail, Shield, Crown, UserMinus } from "lucide-react";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  };
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: "", role: "member" });
  const orgId = "current-org-id"; // Would come from auth context

  useEffect(() => {
    fetchTeamData();
  }, []);

  async function fetchTeamData() {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/organizations/${orgId}/members`),
        fetch(`/api/organizations/${orgId}/invites`),
      ]);
      const [membersData, invitesData] = await Promise.all([
        membersRes.json(),
        invitesRes.json(),
      ]);
      setMembers(membersData.members || []);
      setInvites(invitesData.invites || []);
    } catch (error) {
      console.error("Failed to fetch team data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function sendInvite() {
    try {
      const res = await fetch(`/api/organizations/${orgId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInvite),
      });
      if (res.ok) {
        setShowInviteForm(false);
        setNewInvite({ email: "", role: "member" });
        fetchTeamData();
      }
    } catch (error) {
      console.error("Failed to send invite:", error);
    }
  }

  async function cancelInvite(inviteId: string) {
    try {
      await fetch(`/api/organizations/${orgId}/invites/${inviteId}`, { method: "DELETE" });
      fetchTeamData();
    } catch (error) {
      console.error("Failed to cancel invite:", error);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    try {
      await fetch(`/api/organizations/${orgId}/members/${memberId}`, { method: "DELETE" });
      fetchTeamData();
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  }

  async function updateRole(memberId: string, role: string) {
    try {
      await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      fetchTeamData();
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  }

  const roleIcons: Record<string, React.ReactNode> = {
    owner: <Crown className="h-4 w-4 text-yellow-500" />,
    admin: <Shield className="h-4 w-4 text-blue-500" />,
    member: <Users className="h-4 w-4 text-gray-500" />,
    viewer: <Users className="h-4 w-4 text-gray-400" />,
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage your team members and permissions</p>
        </div>
        <Button onClick={() => setShowInviteForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
            <CardDescription>Send an invitation to join your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={newInvite.email}
                  onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={newInvite.role}
                  onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={sendInvite} disabled={!newInvite.email}>
                <Mail className="h-4 w-4 mr-2" />
                Send Invite
              </Button>
              <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={member.user.avatarUrl} />
                    <AvatarFallback>
                      {member.user.name?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.user.name || member.user.email}</p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {roleIcons[member.role]}
                    <select
                      className="h-8 px-2 rounded border border-input bg-background text-sm"
                      value={member.role}
                      onChange={(e) => updateRole(member.id, e.target.value)}
                      disabled={member.role === "owner"}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  {member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember(member.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites ({invites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited as {invite.role} • Expires{" "}
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => cancelInvite(invite.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
