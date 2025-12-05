import { Brain, Video, FileSearch, Zap, Shield, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Matching",
    description: "Our intelligent algorithms analyze skills, experience, and culture fit to connect the right candidates with the right opportunities.",
  },
  {
    icon: Video,
    title: "Automated Screening",
    description: "10-minute video interviews with AI-assisted evaluation help you shortlist candidates faster without sacrificing quality.",
  },
  {
    icon: FileSearch,
    title: "Portfolio Analysis",
    description: "Deep dive into candidates' GitHub, portfolios, and work samples to assess real-world skills beyond the resume.",
  },
  {
    icon: Zap,
    title: "Instant Applications",
    description: "One-click apply with smart profile auto-fill. No more repetitive form filling for candidates.",
  },
  {
    icon: Shield,
    title: "Bias-Free Hiring",
    description: "Transparent AI scoring with audit trails ensures fair evaluation and compliance with hiring regulations.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time insights into your hiring funnel, time-to-hire metrics, and candidate engagement.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Powerful Features for Modern Recruitment
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to streamline your hiring process and find exceptional talent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-soft transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
