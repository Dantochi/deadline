// The account people sign in with, shared by the accountability partner and backup & sync: the labelled field,
// the card that groups a step, and the sign-in / create-account form.
import { useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Btn, Txt } from './ui';
import { usePartner } from '../lib/partner';
import { F, R, S, usePalette } from '../theme';

export type Run = (fn: () => Promise<unknown>, ok?: string) => Promise<void>;

export function Field(props: TextInputProps & { label: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: S.s1 }}>
      <Txt variant="small" dim>{props.label}</Txt>
      <TextInput placeholderTextColor={p.dim} maxFontSizeMultiplier={2} autoCorrect={false} {...props}
        style={{ minHeight: 52, borderRadius: R.md, borderWidth: 1, borderColor: p.line, backgroundColor: p.bg, paddingHorizontal: S.s3, color: p.ink, fontFamily: F.uiMedium, fontSize: 17 }} />
    </View>
  );
}

export function Block({ title, children }: { title?: string; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ gap: S.s3, padding: S.s4, borderRadius: R.lg, backgroundColor: p.bg }}>
      {title ? <Txt variant="label" dim>{title}</Txt> : null}
      {children}
    </View>
  );
}

export function SignIn({ run, note }: { run: Run; note?: string }) {
  const P = usePartner();
  const [isNew, setIsNew] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <Block title={isNew ? 'Create your account' : 'Sign in'}>
      {/* The reassurance comes first, at reading size: it's what people look for before typing an email. */}
      <Txt variant="meta" dim>{note ?? 'Your email is only for signing in. Your partner sees your name and username, never your email.'}</Txt>
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder={isNew ? 'At least 6 characters' : ''} secureTextEntry autoCapitalize="none"
        autoComplete={isNew ? 'new-password' : 'current-password'} textContentType={isNew ? 'newPassword' : 'password'} />
      <Btn kind="primary" label={isNew ? 'Create account' : 'Sign in'}
        onPress={() => run(() => (isNew ? P.signUp(email, password) : P.signIn(email, password)))} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s1 }}>
        <Btn kind="ghost" label={isNew ? 'I already have an account' : 'I am new here'} onPress={() => setIsNew(!isNew)} />
        {!isNew ? <Btn kind="ghost" label="Forgot password" onPress={() => run(() => P.resetPassword(email), 'Check your email for a reset link')} /> : null}
      </View>
    </Block>
  );
}

