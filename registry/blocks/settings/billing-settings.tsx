import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BillingSettingsBlock() {
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
  );
}
