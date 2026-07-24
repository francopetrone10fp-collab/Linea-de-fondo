import LoginForm from "./LoginForm";
import CourtBackdrop from "@/components/CourtBackdrop";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-5 bg-bg">
      <CourtBackdrop variant="login" />
      <div className="relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
