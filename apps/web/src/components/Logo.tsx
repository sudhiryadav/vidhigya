interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const textSizes = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-3xl",
};

export const Logo = ({
  size = "md",
  showText = true,
  className = "",
}: LogoProps) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <img src="/logo.svg" alt="Vidhigya Logo" className="w-full h-full" />
      </div>
      {showText && (
        <span className={`font-bold text-foreground ${textSizes[size]}`}>
          Vidhigya
        </span>
      )}
    </div>
  );
};
