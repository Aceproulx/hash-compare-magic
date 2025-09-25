import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Copy, Search, Hash, CheckCircle2, AlertCircle, Calculator, BarChart3 } from 'lucide-react';
import CryptoJS from 'crypto-js';
import blake2b from 'blake2b';
import blake2s from 'blake2s';

interface HashResult {
  algorithm: string;
  hash: string;
}

interface EncodingResult {
  algorithm: string;
  encoded: string;
  decoded?: string;
}

interface StatisticalResult {
  test: string;
  value: number;
  description: string;
  result?: string;
}

const HashGenerator: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [compareHash, setCompareHash] = useState('');
  const [hashes, setHashes] = useState<HashResult[]>([]);
  const [encodings, setEncodings] = useState<EncodingResult[]>([]);
  const [statistics, setStatistics] = useState<StatisticalResult[]>([]);
  const [matchingAlgorithm, setMatchingAlgorithm] = useState<string | null>(null);

  // CRC32 implementation
  const crc32 = (str: string): string => {
    let crc = -1;
    for (let i = 0; i < str.length; i++) {
      crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    return ((crc ^ (-1)) >>> 0).toString(16).padStart(8, '0');
  };

  const CRC32_TABLE = (() => {
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return table;
  })();

  // MurmurHash3 implementation (simplified)
  const murmurHash3 = (text: string): string => {
    let hash = 0;
    if (text.length === 0) return hash.toString(16).padStart(8, '0');
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16).padStart(8, '0');
  };

  const hashAlgorithms = [
    { name: 'MD5', func: (text: string) => CryptoJS.MD5(text).toString() },
    { name: 'SHA1', func: (text: string) => CryptoJS.SHA1(text).toString() },
    { name: 'SHA256', func: (text: string) => CryptoJS.SHA256(text).toString() },
    { name: 'SHA512', func: (text: string) => CryptoJS.SHA512(text).toString() },
    { name: 'SHA3-224', func: (text: string) => CryptoJS.SHA3(text, { outputLength: 224 }).toString() },
    { name: 'SHA3-256', func: (text: string) => CryptoJS.SHA3(text, { outputLength: 256 }).toString() },
    { name: 'SHA3-384', func: (text: string) => CryptoJS.SHA3(text, { outputLength: 384 }).toString() },
    { name: 'SHA3-512', func: (text: string) => CryptoJS.SHA3(text, { outputLength: 512 }).toString() },
    { name: 'Keccak-256', func: (text: string) => CryptoJS.Keccak(text, { outputLength: 256 }).toString() },
    { name: 'Keccak-512', func: (text: string) => CryptoJS.Keccak(text, { outputLength: 512 }).toString() },
    { name: 'RIPEMD160', func: (text: string) => CryptoJS.RIPEMD160(text).toString() },
    { 
      name: 'BLAKE2b', 
      func: (text: string) => {
        const output = blake2b(32);
        output.update(Buffer.from(text, 'utf8'));
        return output.digest('hex');
      }
    },
    { 
      name: 'BLAKE2s', 
      func: (text: string) => {
        const output = blake2s(32);
        output.update(Buffer.from(text, 'utf8'));
        return output.digest('hex');
      }
    },
    { name: 'CRC32', func: crc32 },
    { name: 'MurmurHash3', func: murmurHash3 },
  ];

  const encodingAlgorithms = [
    { 
      name: 'Base64', 
      encode: (text: string) => btoa(text),
      decode: (text: string) => {
        try { return atob(text); } catch { return 'Invalid Base64'; }
      }
    },
    { 
      name: 'Base64 URL-Safe', 
      encode: (text: string) => btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
      decode: (text: string) => {
        try { 
          const padded = text + '='.repeat((4 - text.length % 4) % 4);
          return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
        } catch { return 'Invalid Base64 URL-Safe'; }
      }
    },
    { 
      name: 'Hex Encode', 
      encode: (text: string) => Array.from(new TextEncoder().encode(text))
        .map(b => b.toString(16).padStart(2, '0')).join(''),
      decode: (text: string) => {
        try {
          const matches = text.match(/.{1,2}/g);
          if (!matches) return 'Invalid Hex';
          return new TextDecoder().decode(new Uint8Array(matches.map(byte => parseInt(byte, 16))));
        } catch { return 'Invalid Hex'; }
      }
    },
  ];

  // Statistical analysis functions
  const calculateShannonEntropy = (text: string): number => {
    const freq: { [key: string]: number } = {};
    for (const char of text) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const length = text.length;
    for (const count of Object.values(freq)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }
    return entropy;
  };

  const calculateChiSquare = (text: string): number => {
    const freq = new Array(256).fill(0);
    for (let i = 0; i < text.length; i++) {
      freq[text.charCodeAt(i)]++;
    }
    
    const expected = text.length / 256;
    let chiSquare = 0;
    for (const observed of freq) {
      if (expected > 0) {
        chiSquare += Math.pow(observed - expected, 2) / expected;
      }
    }
    return chiSquare;
  };

  const monobitTest = (text: string): number => {
    const bytes = new TextEncoder().encode(text);
    let ones = 0;
    for (const byte of bytes) {
      ones += byte.toString(2).split('1').length - 1;
    }
    const n = bytes.length * 8;
    const s = 2 * ones - n;
    return Math.abs(s) / Math.sqrt(n);
  };

  const runsTest = (text: string): number => {
    const bytes = new TextEncoder().encode(text);
    const bits = Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join('');
    
    let runs = 1;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i-1]) runs++;
    }
    
    const n = bits.length;
    const ones = bits.split('1').length - 1;
    const zeros = n - ones;
    
    if (ones === 0 || zeros === 0) return 0;
    
    const expectedRuns = (2 * ones * zeros) / n + 1;
    const variance = (2 * ones * zeros * (2 * ones * zeros - n)) / (n * n * (n - 1));
    
    return Math.abs(runs - expectedRuns) / Math.sqrt(variance);
  };

  const generateHashes = useCallback(() => {
    if (!inputText.trim()) {
      toast({
        title: "Input required",
        description: "Please enter some text to generate hashes.",
        variant: "destructive",
      });
      return;
    }

    // Generate hashes
    const hashResults: HashResult[] = hashAlgorithms.map(algo => ({
      algorithm: algo.name,
      hash: algo.func(inputText)
    }));

    // Generate encodings
    const encodingResults: EncodingResult[] = encodingAlgorithms.map(algo => ({
      algorithm: algo.name,
      encoded: algo.encode(inputText),
      decoded: algo.decode(algo.encode(inputText))
    }));

    // Generate statistics
    const statisticalResults: StatisticalResult[] = [
      {
        test: 'Shannon Entropy',
        value: calculateShannonEntropy(inputText),
        description: 'Measures randomness/information content (0-8 bits)',
        result: calculateShannonEntropy(inputText) > 7 ? 'High entropy' : 'Low entropy'
      },
      {
        test: 'Chi-square Test',
        value: calculateChiSquare(inputText),
        description: 'Tests for uniform distribution of characters',
        result: calculateChiSquare(inputText) < 293.25 ? 'Uniform' : 'Non-uniform'
      },
      {
        test: 'Monobit/Frequency Test',
        value: monobitTest(inputText),
        description: 'Tests for equal distribution of 0s and 1s',
        result: monobitTest(inputText) < 1.96 ? 'Random' : 'Non-random'
      },
      {
        test: 'Runs Test',
        value: runsTest(inputText),
        description: 'Tests for runs of consecutive identical bits',
        result: runsTest(inputText) < 1.96 ? 'Random' : 'Non-random'
      }
    ];

    setHashes(hashResults);
    setEncodings(encodingResults);
    setStatistics(statisticalResults);
    
    toast({
      title: "Analysis complete",
      description: `Generated ${hashResults.length} hashes, ${encodingResults.length} encodings, and ${statisticalResults.length} statistical tests.`,
    });
  }, [inputText]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${label} copied successfully.`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard.",
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
            Cryptographic Analysis Tool
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Comprehensive cryptographic hash generator, encoder, and statistical analysis tool for security professionals.
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
            <Label htmlFor="input-text">Enter text to analyze:</Label>
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
            Generate Analysis
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
      {(hashes.length > 0 || encodings.length > 0 || statistics.length > 0) && (
        <Tabs defaultValue="hashes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hashes" className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Hashes ({hashes.length})
            </TabsTrigger>
            <TabsTrigger value="encodings" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Encodings ({encodings.length})
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics ({statistics.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hashes">
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
          </TabsContent>

          <TabsContent value="encodings">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Encodings & Decodings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {encodings.map((result) => (
                    <div key={result.algorithm} className="p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="font-semibold">
                          {result.algorithm}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(result.encoded, `${result.algorithm} encoded`)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Encoded:</Label>
                          <p className="font-mono text-xs break-all text-foreground select-all bg-muted/50 p-2 rounded mt-1">
                            {result.encoded}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Decoded (verification):</Label>
                          <p className="font-mono text-xs break-all text-muted-foreground bg-muted/30 p-2 rounded mt-1">
                            {result.decoded}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Statistical Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {statistics.map((result) => (
                    <div key={result.test} className="p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-semibold">
                          {result.test}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(result.value.toString(), result.test)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-mono font-bold text-primary">
                          {result.value.toFixed(4)}
                        </p>
                        {result.result && (
                          <Badge 
                            variant={result.result.includes('Random') || result.result.includes('High') || result.result.includes('Uniform') ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {result.result}
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {result.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Info Section */}
      <Card className="bg-card/30 backdrop-blur border-border/30">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Comprehensive cryptographic analysis tool featuring hash generation, encoding/decoding, and statistical randomness testing.
              Perfect for security research, data analysis, and cryptographic verification.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HashGenerator;