import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function WorkOrderCreateSection({ icon: Icon, title, description, children }: Props) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="px-5 pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
          {title}
        </CardTitle>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5">{children}</CardContent>
    </Card>
  );
}
