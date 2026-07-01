import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import type { Block } from "@/lib/blocks"
import type { ReactNode } from "react"

const previews = {
  "billing-settings": <BillingSettingsPreview />,
  "invite-acceptance": <InviteAcceptancePreview />,
  "login-workspace": <LoginWorkspacePreview />,
  "metric-card": <MetricCardPreview />,
  "notification-settings": <NotificationSettingsPreview />,
  "payment-method-card": <PaymentMethodCardPreview />,
  "password-recovery": <PasswordRecoveryPreview />,
  "profile-settings": <ProfileSettingsPreview />,
  "signup-team": <SignupTeamPreview />,
  "support-ticket-card": <SupportTicketCardPreview />,
  "team-member-card": <TeamMemberCardPreview />,
  "team-settings": <TeamSettingsPreview />,
} satisfies Record<string, ReactNode>

export function BlockPreview({ block }: { block: Block }) {
  return previews[block.slug as keyof typeof previews] ?? null
}

function LoginWorkspacePreview() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in to Acme</CardTitle>
        <CardDescription>Use your work email to continue.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input type="email" placeholder="name@company.com" />
        <Input type="password" placeholder="Password" />
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="link" className="px-0">
          Reset password
        </Button>
        <Button>Sign in</Button>
      </CardFooter>
    </Card>
  )
}

function SignupTeamPreview() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>
          Start with the essentials. Invite people later.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input placeholder="Workspace name" />
        <Input type="email" placeholder="you@company.com" />
        <Input type="password" placeholder="Create password" />
      </CardContent>
      <CardFooter>
        <Button className="w-full">Create workspace</Button>
      </CardFooter>
    </Card>
  )
}

function PasswordRecoveryPreview() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          We will send a secure reset link if the account exists.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Input type="email" placeholder="name@company.com" />
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="ghost">Back</Button>
        <Button>Send link</Button>
      </CardFooter>
    </Card>
  )
}

function InviteAcceptancePreview() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Join Northstar Studio</CardTitle>
        <CardDescription>Praveen invited you to collaborate.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input defaultValue="name@company.com" type="email" />
        <Input placeholder="Full name" />
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Decline</Button>
        <Button>Accept invite</Button>
      </CardFooter>
    </Card>
  )
}

function ProfileSettingsPreview() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Keep your public account details current.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Input defaultValue="Praveen Juge" />
        <Input defaultValue="Lead Designer" />
      </CardContent>
      <CardFooter className="justify-end">
        <Button>Save changes</Button>
      </CardFooter>
    </Card>
  )
}

function TeamSettingsPreview() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          Invite teammates with the right workspace context.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input placeholder="teammate@company.com" type="email" />
        <Input defaultValue="Member" />
      </CardContent>
      <CardFooter className="justify-end">
        <Button>Send invite</Button>
      </CardFooter>
    </Card>
  )
}

function NotificationSettingsPreview() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choose the updates that should reach your inbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p className="rounded-lg border p-3">Product updates: Weekly digest</p>
        <p className="rounded-lg border p-3">Security alerts: Immediately</p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button>Update preferences</Button>
      </CardFooter>
    </Card>
  )
}

function BillingSettingsPreview() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Manage your plan and next renewal.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <p>Pro plan · 12 seats</p>
        <p className="text-muted-foreground">Next invoice: Aug 1, 2026</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Invoices</Button>
        <Button>Manage plan</Button>
      </CardFooter>
    </Card>
  )
}

function MetricCardPreview() {
  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <CardDescription>Active subscribers</CardDescription>
        <CardTitle className="text-3xl">12,840</CardTitle>
        <CardDescription>Up 8.2% from last month</CardDescription>
      </CardHeader>
    </Card>
  )
}

function PaymentMethodCardPreview() {
  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <CardTitle>Visa ending 4242</CardTitle>
        <CardDescription>
          Expires 09/28 · Default payment method
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-end">
        <Button variant="outline">Update</Button>
      </CardFooter>
    </Card>
  )
}

function TeamMemberCardPreview() {
  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <CardTitle>Amara Chen</CardTitle>
        <CardDescription>Product Manager · Workspace admin</CardDescription>
      </CardHeader>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost">Message</Button>
        <Button variant="outline">Manage</Button>
      </CardFooter>
    </Card>
  )
}

function SupportTicketCardPreview() {
  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <CardTitle>Invoice export failed</CardTitle>
        <CardDescription>Open · Billing · Last updated 12m ago</CardDescription>
      </CardHeader>
      <CardFooter className="justify-end">
        <Button>View ticket</Button>
      </CardFooter>
    </Card>
  )
}
