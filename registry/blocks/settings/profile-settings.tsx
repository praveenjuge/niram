import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ProfileSettingsBlock() {
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
  );
}
