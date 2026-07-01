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

export default function PasswordRecoveryBlock() {
  return (
    <Card className="mx-auto w-full max-w-sm">
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
  );
}
