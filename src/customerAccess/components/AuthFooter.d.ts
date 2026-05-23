type AuthFooterClassNames = {
  footer?: string;
  primaryLinks?: string;
  link?: string;
  businessName?: string;
  policyLinks?: string;
  policyLink?: string;
  policyDivider?: string;
};

export default function AuthFooter(props: {
  variant?: string;
  classNames?: AuthFooterClassNames;
}): JSX.Element;