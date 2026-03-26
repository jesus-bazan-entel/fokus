import LoginForm from '../components/auth/LoginForm'

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string, fullName: string) => Promise<void>
}

export default function LoginPage({ onSignIn, onSignUp }: Props) {
  return <LoginForm onSignIn={onSignIn} onSignUp={onSignUp} />
}
