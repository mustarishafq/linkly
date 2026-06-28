import { useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { SETTINGS_TABS, VALID_SETTINGS_TAB_IDS } from "@/lib/settingsConfig";
import PageHeader from "@/components/layout/PageHeader";
import GeneralSettings from "@/components/settings/GeneralSettings";
import NexusSsoSettings from "@/components/settings/NexusSsoSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import McpApiSettings from "@/components/settings/McpApiSettings";
import QrDefaultSettings from "@/components/qr/QrDefaultSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_SETTINGS_TAB_IDS.has(tabParam) ? tabParam : SETTINGS_TABS[0].id;
  const activeTabMeta = SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0];

  const handleTabChange = (value) => {
    if (value === SETTINGS_TABS[0].id) {
      setSearchParams({}, { replace: true });
      return;
    }

    setSearchParams({ tab: value }, { replace: true });
  };

  if (user?.role !== "admin") {
    return <div className="p-6 text-sm text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={activeTabMeta.description}
        icon={ShieldCheck}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <TabsList className="h-auto w-full shrink-0 flex-row justify-start gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1 lg:w-60 lg:flex-col lg:items-stretch lg:overflow-visible xl:w-64">
          {SETTINGS_TABS.map(({ id, label, description, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="h-auto shrink-0 justify-start gap-2 px-3 py-2 text-left data-[state=active]:shadow-sm lg:w-full lg:py-2.5"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex min-w-0 flex-col items-start">
                <span className="text-xs sm:text-sm">{label}</span>
                <span className="hidden text-[11px] font-normal leading-tight text-muted-foreground lg:block">
                  {description}
                </span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0 flex-1">
          <TabsContent value="general" className="mt-0 focus-visible:outline-none">
            <GeneralSettings />
          </TabsContent>
          <TabsContent value="security" className="mt-0 focus-visible:outline-none">
            <NexusSsoSettings />
          </TabsContent>
          <TabsContent value="qr" className="mt-0 focus-visible:outline-none">
            <QrDefaultSettings />
          </TabsContent>
          <TabsContent value="notifications" className="mt-0 focus-visible:outline-none">
            <NotificationSettings />
          </TabsContent>
          <TabsContent value="mcp" className="mt-0 focus-visible:outline-none">
            <McpApiSettings />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
