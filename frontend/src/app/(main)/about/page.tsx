import { Card } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">About DOTS</h1>
      <Card>
        <div className="prose max-w-none">
          <p>
            <strong>DOTS</strong> (Distributed Olympiad Testing System) is an online competitive
            programming judge and contest platform. It provides a comprehensive environment for
            hosting programming contests, managing problems, and automatically testing submitted
            solutions.
          </p>
          <h3>Features</h3>
          <ul>
            <li>Multiple contest formats: Classic, ACM-ICPC, IOI, and more</li>
            <li>Automatic solution testing with support for multiple programming languages</li>
            <li>Real-time standings and scoring</li>
            <li>Problem archive for practice</li>
            <li>User profiles and messaging system</li>
            <li>Administrative tools for contest and problem management</li>
          </ul>
          <h3>Contest Types</h3>
          <ul>
            <li><strong>Classic</strong> - Traditional scoring with partial points per test</li>
            <li><strong>ACM-ICPC</strong> - Binary scoring with time-based penalty</li>
            <li><strong>IOI</strong> - Subtask-based scoring</li>
            <li><strong>School</strong> - Simplified format for educational use</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
