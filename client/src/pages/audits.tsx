import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CustomModel, Audit } from "@shared/schema";

const auditCategories = ["Bias", "Hallucination", "PII", "Compliance", "Drift"];

export default function Audits() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"model" | "log">("model");

  const [selectedModel, setSelectedModel] = useState("");
  const [testPrompts, setTestPrompts] = useState("");
  const [iterations, setIterations] = useState("10");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Bias",
    "Hallucination",
  ]);

  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [samplingRate, setSamplingRate] = useState("100");
  const [selectedPassiveCategories, setSelectedPassiveCategories] = useState<
    string[]
  >(["Compliance", "PII"]);

  const { data: customModels = [] } = useQuery<CustomModel[]>({
    queryKey: ["/api/models"],
  });

  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: ["/api/audits"],
  });

  const createAuditMutation = useMutation({
    mutationFn: async (data: {
      type: "model" | "log";
      modelId?: string;
      categories: string[];
      testPrompts?: string;
      iterations?: number;
    }) => {
      return apiRequest("POST", "/api/audits", {
        ...data,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({ title: "Audit started successfully" });
    },
    onError: () => {
      toast({ title: "Failed to start audit", variant: "destructive" });
    },
  });

  const toggleCategory = (category: string, isActive: boolean) => {
    if (isActive) {
      setSelectedCategories((prev) =>
        prev.includes(category)
          ? prev.filter((c) => c !== category)
          : [...prev, category]
      );
    } else {
      setSelectedPassiveCategories((prev) =>
        prev.includes(category)
          ? prev.filter((c) => c !== category)
          : [...prev, category]
      );
    }
  };

  const handleStartModelAudit = () => {
    if (!selectedModel) {
      toast({ title: "Please select a model", variant: "destructive" });
      return;
    }
    if (!testPrompts.trim()) {
      toast({ title: "Please enter test prompts", variant: "destructive" });
      return;
    }

    createAuditMutation.mutate({
      type: "model",
      modelId: selectedModel,
      categories: selectedCategories,
      testPrompts,
      iterations: parseInt(iterations),
    });
  };

  const handleStartLogAudit = () => {
    createAuditMutation.mutate({
      type: "log",
      categories: selectedPassiveCategories,
    });
  };

  const modelAudits = audits.filter((a) => a.type === "model");
  const logAudits = audits.filter((a) => a.type === "log");

  return (
    <div className="p-6">
      <div className="mb-8 pb-4 border-b-2 border-border">
        <h1
          className="text-3xl font-bold text-foreground"
          data-testid="text-page-title"
        >
          Audits
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Perform model auditing on custom models or log auditing on ingested
          logs
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "model" | "log")}
      >
        <TabsList className="mb-8">
          <TabsTrigger value="model" data-testid="tab-model-auditing">
            Model Auditing
          </TabsTrigger>
          <TabsTrigger value="log" data-testid="tab-log-auditing">
            Log Auditing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="model">
          <Card className="mb-6">
            <CardContent className="p-8">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Configure Model Audit
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>
                      Select Model <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                    >
                      <SelectTrigger data-testid="select-model">
                        <SelectValue placeholder="Choose a custom model" />
                      </SelectTrigger>
                      <SelectContent>
                        {customModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.nickname} ({model.provider || "Custom"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Number of Test Iterations</Label>
                    <Input
                      type="number"
                      value={iterations}
                      onChange={(e) => setIterations(e.target.value)}
                      min={1}
                      max={1000}
                      data-testid="input-iterations"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Audit Categories</Label>
                    <div className="flex flex-wrap gap-2">
                      {auditCategories.map((category) => (
                        <Badge
                          key={category}
                          variant={
                            selectedCategories.includes(category)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer px-3 py-1.5"
                          onClick={() => toggleCategory(category, true)}
                          data-testid={`badge-category-${category.toLowerCase()}`}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Test Prompts <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={testPrompts}
                    onChange={(e) => setTestPrompts(e.target.value)}
                    placeholder="Enter test prompts, one per line..."
                    className="h-[240px] font-mono text-sm"
                    data-testid="textarea-test-prompts"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter one prompt per line. The model will be tested with
                    each prompt.
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <Button
                  onClick={handleStartModelAudit}
                  disabled={createAuditMutation.isPending}
                  data-testid="button-start-model-audit"
                >
                  {createAuditMutation.isPending
                    ? "Starting..."
                    : "Start Model Audit"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-base font-semibold text-foreground mb-4">
              Recent Model Audits
            </h3>
            {modelAudits.length > 0 ? (
              <div className="space-y-3">
                {modelAudits.map((audit) => (
                  <Card key={audit.id} data-testid={`card-audit-${audit.id}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">
                          Audit #{audit.id.slice(0, 8)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {audit.categories?.join(", ")}
                        </div>
                      </div>
                      <Badge
                        variant={
                          audit.status === "completed"
                            ? "default"
                            : audit.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {audit.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  No model audits yet. Start your first audit above.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="log">
          <Card className="mb-6">
            <CardContent className="p-8">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Configure Log Audit
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Upload Log File</Label>
                    <div className="border-2 border-dashed border-border rounded-md p-8 text-center">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop your log file here, or click to browse
                      </p>
                      <Button variant="outline" size="sm">
                        Browse Files
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) =>
                          setDateRange({ ...dateRange, start: e.target.value })
                        }
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) =>
                          setDateRange({ ...dateRange, end: e.target.value })
                        }
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Sampling Rate (%)</Label>
                    <Input
                      type="number"
                      value={samplingRate}
                      onChange={(e) => setSamplingRate(e.target.value)}
                      min={1}
                      max={100}
                      data-testid="input-sampling-rate"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Audit Categories</Label>
                    <div className="flex flex-wrap gap-2">
                      {auditCategories.map((category) => (
                        <Badge
                          key={category}
                          variant={
                            selectedPassiveCategories.includes(category)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer px-3 py-1.5"
                          onClick={() => toggleCategory(category, false)}
                          data-testid={`badge-log-category-${category.toLowerCase()}`}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <Button
                  onClick={handleStartLogAudit}
                  disabled={createAuditMutation.isPending}
                  data-testid="button-start-log-audit"
                >
                  {createAuditMutation.isPending
                    ? "Starting..."
                    : "Start Log Audit"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-base font-semibold text-foreground mb-4">
              Recent Log Audits
            </h3>
            {logAudits.length > 0 ? (
              <div className="space-y-3">
                {logAudits.map((audit) => (
                  <Card
                    key={audit.id}
                    data-testid={`card-log-audit-${audit.id}`}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">
                          Log Audit #{audit.id.slice(0, 8)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {audit.categories?.join(", ")}
                        </div>
                      </div>
                      <Badge
                        variant={
                          audit.status === "completed"
                            ? "default"
                            : audit.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {audit.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  No log audits yet. Start your first audit above.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
