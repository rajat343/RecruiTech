import { UserPlus, Search, MessageSquare, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Your Profile",
    description: "Sign up and build your professional profile. Upload your resume, add skills, and connect your portfolio.",
  },
  {
    icon: Search,
    step: "02",
    title: "Discover Opportunities",
    description: "Browse AI-curated job matches or search for specific roles. Get personalized recommendations daily.",
  },
  {
    icon: MessageSquare,
    step: "03",
    title: "Apply & Interview",
    description: "One-click apply and complete video screenings. Track your applications in real-time.",
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Land Your Dream Job",
    description: "Receive offers, negotiate, and accept. Start your new career journey with confidence.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            How RecruiTech Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your journey to the perfect job is just four steps away.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-primary/50 to-accent/50" />
              )}

              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                    <step.icon className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center font-display font-bold text-sm text-primary">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
