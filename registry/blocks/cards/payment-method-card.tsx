import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PaymentMethodCardBlock() {
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
  );
}
