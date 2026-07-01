import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SupportTicketCardBlock() {
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
  );
}
