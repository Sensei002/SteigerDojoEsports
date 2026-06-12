import { useRef, useState } from 'react';
import { FiUploadCloud } from 'react-icons/fi';
import clsx from 'clsx';

interface Props {
  onFile: (file: File) => void;
  preview?: string;
  label?: string;
  rounded?: boolean;
  className?: string;
}

/** Click-to-upload image picker with a live preview. */
const ImageUpload = ({ onFile, preview, label = 'Upload image', rounded, className }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | undefined>(preview);

  const handle = (file?: File) => {
    if (!file) return;
    setLocalPreview(URL.createObjectURL(file));
    onFile(file);
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={clsx(
        'group relative flex h-32 w-full items-center justify-center overflow-hidden border-2 border-dashed border-brand-border bg-brand-dark transition-colors hover:border-brand-red/60',
        rounded ? 'rounded-full aspect-square h-28 w-28' : 'rounded-xl',
        className
      )}
    >
      {localPreview ? (
        <img src={localPreview} alt="preview" className="h-full w-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 text-brand-gray group-hover:text-brand-light">
          <FiUploadCloud size={24} />
          <span className="text-xs">{label}</span>
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </button>
  );
};

export default ImageUpload;
