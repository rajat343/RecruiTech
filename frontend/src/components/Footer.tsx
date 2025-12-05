import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-navy text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">R</span>
              </div>
              <span className="font-display font-bold text-xl">
                Recrui<span className="text-primary">Tech</span>
              </span>
            </div>
            <p className="text-primary-foreground/70 text-sm">
              Where technology meets talent. Revolutionizing recruitment with AI-powered matching.
            </p>
          </div>

          {/* For Candidates */}
          <div>
            <h4 className="font-display font-semibold mb-4">For Candidates</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/jobs" className="hover:text-primary transition-colors">Browse Jobs</Link></li>
              <li><Link to="/profile" className="hover:text-primary transition-colors">Create Profile</Link></li>
              <li><Link to="/resources" className="hover:text-primary transition-colors">Career Resources</Link></li>
              <li><Link to="/salary" className="hover:text-primary transition-colors">Salary Guide</Link></li>
            </ul>
          </div>

          {/* For Employers */}
          <div>
            <h4 className="font-display font-semibold mb-4">For Employers</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/post-job" className="hover:text-primary transition-colors">Post a Job</Link></li>
              <li><Link to="/talent-search" className="hover:text-primary transition-colors">Search Talent</Link></li>
              <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link to="/enterprise" className="hover:text-primary transition-colors">Enterprise</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-primary-foreground/50">
            © 2025 RecruiTech. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-primary-foreground/50 hover:text-primary transition-colors text-sm">
              Terms of Service
            </a>
            <a href="#" className="text-primary-foreground/50 hover:text-primary transition-colors text-sm">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
