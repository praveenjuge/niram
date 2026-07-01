import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MetricCardBlock() {
  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <CardDescription>Active subscribers</CardDescription>
        <CardTitle className="text-3xl">12,840</CardTitle>
        <CardDescription>Up 8.2% from last month</CardDescription>
      </CardHeader>
    </Card>
  );
}
