import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Copy, Search, Hash, CheckCircle2, AlertCircle } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface HashResult {
  algorithm: string;
  hash: string;
}

const HashGenerator: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [compareHash, setCompareHash] = useState('');
  const [hashes, setHashes] = useState<HashResult[]>([]);
  const [matchingAlgorithm, setMatchingAlgorithm] = useState<string | null>(null);

  const hashAlgorithms = [
    { name: 'MD5', func: (text: string) => CryptoJS.MD5(text).toString() },
    { name: 'SHA1', func: (text: string) => CryptoJS.SHA1(text).toString() },
    { name: 'SHA256', func: (text: string) => CryptoJS.SHA256(text).toString() },
    { name: 'SHA512', func: (text: string) => CryptoJS.SHA512(text).toString() },
    { name: 'SHA3-224', func: (text: string) => CryptoJS.SHA3(text, { outputLength: 224 }).toString() },
    { name: 'SHA3-256', func: (text: string) => CryptoJS.SHA3(text, { outputLength: 256 }).toString() },
    { name: 'SHA3-384', func: (text: string) => CryptoJS.SHA3(text, { outputLength: 384 }).toString() },
    { name: 'SHA3-512', func: (text: string) => CryptoJS.SHA3(text, { outputLength: 512 }).toString() },
    { name: 'RIPEMD160', func: (text: string) => CryptoJS.RIPEMD160(text).toString() },
  ];

  const generateHashes = useCallback(() => {
    if (!inputText.trim()) {
      toast({
        title: "Input required",
        description: "Please enter some text to generate hashes.",
        variant: "destructive",
      });
      return;
    }

    const results: HashResult[] = hashAlgorithms.map(algo => ({
      algorithm: algo.name,
      hash: algo.func(inputText)
    }));

    setHashes(results);
    toast({
      title: "Hashes generated",
      description: `Generated ${results.length} different hash values.`,
    });
  }, [inputText]);

  const copyToClipboard = async (hash: string, algorithm: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast({
        title: "Copied to clipboard",
        description: `${algorithm} hash copied successfully.`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy hash to clipboard.",
        variant: "destructive",
      });
    }
  };

  const compareHashes = useCallback(() => {
    if (!compareHash.trim()) {
      setMatchingAlgorithm(null);
      return;
    }

    const cleanCompareHash = compareHash.trim().toLowerCase();
    const match = hashes.find(h => h.hash.toLowerCase() === cleanCompareHash);
    
    if (match) {
      setMatchingAlgorithm(match.algorithm);
      toast({
        title: "Match found!",
        description: `Hash matches ${match.algorithm} algorithm.`,
      });
    } else {
      setMatchingAlgorithm('no-match');
      toast({
        title: "No match",
        description: "Hash doesn't match any generated hashes.",
        variant: "destructive",
      });
    }
  }, [compareHash, hashes]);

  React.useEffect(() => {
    if (compareHash) {
      compareHashes();
    } else {
      setMatchingAlgorithm(null);
    }
  }, [compareHash, compareHashes]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Hash className="w-12 h-12 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
            Hash Generator
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Generate multiple cryptographic hashes from your input text and compare them with existing hashes.
        </p>
      </div>

      {/* Input Section */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Input Text
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input-text">Enter text to hash:</Label>
            <Textarea
              id="input-text"
              placeholder="Enter your text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="min-h-[100px] bg-muted/30"
            />
          </div>
          <Button 
            onClick={generateHashes}
            className="w-full bg-gradient-to-r from-primary to-success hover:opacity-90 transition-opacity"
            disabled={!inputText.trim()}
          >
            Generate Hashes
          </Button>
        </CardContent>
      </Card>

      {/* Compare Section */}
      {hashes.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Compare Hash
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compare-hash">Enter hash to compare:</Label>
              <div className="flex gap-2">
                <Input
                  id="compare-hash"
                  placeholder="Enter hash to compare with generated hashes..."
                  value={compareHash}
                  onChange={(e) => setCompareHash(e.target.value)}
                  className="bg-muted/30 font-mono text-sm"
                />
                {matchingAlgorithm && matchingAlgorithm !== 'no-match' && (
                  <Badge variant="default" className="flex items-center gap-1 px-3">
                    <CheckCircle2 className="w-3 h-3" />
                    {matchingAlgorithm}
                  </Badge>
                )}
                {matchingAlgorithm === 'no-match' && (
                  <Badge variant="destructive" className="flex items-center gap-1 px-3">
                    <AlertCircle className="w-3 h-3" />
                    No match
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {hashes.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Generated Hashes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {hashes.map((result) => (
                <div
                  key={result.algorithm}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    matchingAlgorithm === result.algorithm
                      ? 'border-success bg-success/10 shadow-glow'
                      : 'border-border bg-muted/20 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-semibold">
                        {result.algorithm}
                      </Badge>
                      {matchingAlgorithm === result.algorithm && (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result.hash, result.algorithm)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="font-mono text-xs break-all text-muted-foreground select-all">
                    {result.hash}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <Card className="bg-card/30 backdrop-blur border-border/30">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              This tool generates cryptographic hashes using various algorithms including MD5, SHA family, and RIPEMD160.
              Use the compare feature to check if a hash matches any of the generated values.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HashGenerator;