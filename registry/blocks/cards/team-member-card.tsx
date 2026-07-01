import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TeamMemberCardBlock() {
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
  );
}
