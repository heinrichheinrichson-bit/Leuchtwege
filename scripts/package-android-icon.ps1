param([string]$OutputDirectory = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (!$OutputDirectory) { $OutputDirectory = Join-Path $projectRoot 'assets/branding/tvispy/export' }
New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
Add-Type -AssemblyName System.Drawing
# Mechanical asset packaging only: preserve the ImageGen artwork and alpha,
# normalize to Android's safe circle, then export density-specific resources.
Add-Type -ReferencedAssemblies System.Drawing.Common,System.Drawing.Primitives,System.Private.Windows.GdiPlus,System.Private.Windows.Core,System.Console -TypeDefinition @'
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
public static class TvispyIconPack {
  public static void Build(string source, string resources, string output) {
    using (var art = new Bitmap(source)) {
      if (art.GetPixel(0,0).A != 0) throw new Exception("Foreground is not transparent.");
      int left=art.Width, top=art.Height, right=0, bottom=0;
      for(int y=0;y<art.Height;y++) for(int x=0;x<art.Width;x++) {
        if(art.GetPixel(x,y).A<8) continue;
        left=Math.Min(left,x);right=Math.Max(right,x);top=Math.Min(top,y);bottom=Math.Max(bottom,y);
      }
      float cx=(left+right)/2f, cy=(top+bottom)/2f;
      double radius=0;
      for(int y=top;y<=bottom;y++) for(int x=left;x<=right;x++) {
        if(art.GetPixel(x,y).A>=8) radius=Math.Max(radius,Math.Sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy)));
      }
      float scale=(float)(32.0/radius); // 32dp radius: 1dp reserve inside the 66dp safe circle.
      string[] names={"mdpi","hdpi","xhdpi","xxhdpi","xxxhdpi"};
      int[] layer={108,162,216,324,432}, legacy={48,72,96,144,192};
      for(int i=0;i<names.Length;i++) {
        string dir=Path.Combine(resources,"mipmap-"+names[i]);Directory.CreateDirectory(dir);
        using(var foreground=Layer(art,layer[i],cx,cy,scale)) {
          foreground.Save(Path.Combine(dir,"tvispy_foreground.png"),ImageFormat.Png);
          CheckSafeCircle(foreground);
        }
        using(var square=Icon(art,legacy[i],cx,cy,scale,"rounded")) square.Save(Path.Combine(dir,"tvispy.png"),ImageFormat.Png);
        using(var circle=Icon(art,legacy[i],cx,cy,scale,"circle")) circle.Save(Path.Combine(dir,"tvispy_round.png"),ImageFormat.Png);
      }
      using(var master=Layer(art,1080,cx,cy,scale)) master.Save(Path.Combine(output,"Tvispy-foreground-1080.png"),ImageFormat.Png);
      using(var store=Icon(art,512,cx,cy,scale,"square")) store.Save(Path.Combine(output,"Tvispy-icon-512.png"),ImageFormat.Png);
      using(var store=Icon(art,1024,cx,cy,scale,"square")) store.Save(Path.Combine(output,"Tvispy-icon-1024.png"),ImageFormat.Png);
      using(var sheet=new Bitmap(900,440)) using(var g=Graphics.FromImage(sheet)) {
        g.Clear(Color.FromArgb(232,237,242));
        string[] masks={"circle","rounded","square"};string[] labels={"Rund","Abgerundet","Quadratisch"};
        using(var font=new Font("Arial",15)) using(var brush=new SolidBrush(Color.FromArgb(20,32,48))) {
          for(int i=0;i<3;i++) {
            using(var icon=Icon(art,192,cx,cy,scale,masks[i]))g.DrawImageUnscaled(icon,54+i*300,36);
            g.DrawString(labels[i],font,brush,54+i*300,244);
            int x=54+i*300;
            foreach(int n in new[]{48,36,24}) { using(var icon=Icon(art,n,cx,cy,scale,masks[i]))g.DrawImageUnscaled(icon,x,302);g.DrawString(n+"px",font,brush,x,362);x+=82; }
          }
        }
        sheet.Save(Path.Combine(output,"Tvispy-icon-preview.png"),ImageFormat.Png);
      }
      Console.WriteLine("PASS: genuine alpha, five density exports, foreground contained in Android safe circle.");
      Console.WriteLine("Artwork bounds: "+(right-left+1)+"x"+(bottom-top+1)+"; normalized width "+((right-left+1)*scale).ToString("F1")+"dp");
    }
  }
  static Graphics Quality(Bitmap b) {var g=Graphics.FromImage(b);g.CompositingQuality=CompositingQuality.HighQuality;g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.PixelOffsetMode=PixelOffsetMode.HighQuality;g.SmoothingMode=SmoothingMode.AntiAlias;return g;}
  static Bitmap Layer(Bitmap a,int size,float cx,float cy,float scale) {
    var b=new Bitmap(size,size,PixelFormat.Format32bppArgb);float s=scale*size/108f;
    using(var g=Quality(b)){g.Clear(Color.Transparent);g.DrawImage(a,new RectangleF(size/2f-cx*s,size/2f-cy*s,a.Width*s,a.Height*s));}return b;
  }
  static Bitmap Icon(Bitmap a,int size,float cx,float cy,float scale,string mask) {
    var b=new Bitmap(size,size,PixelFormat.Format32bppArgb);
    using(var g=Quality(b)) using(var p=new GraphicsPath()) {
      if(mask=="circle")p.AddEllipse(0,0,size,size);
      else if(mask=="rounded") {float d=size*.4f;p.AddArc(0,0,d,d,180,90);p.AddArc(size-d,0,d,d,270,90);p.AddArc(size-d,size-d,d,d,0,90);p.AddArc(0,size-d,d,d,90,90);p.CloseFigure();}
      else p.AddRectangle(new Rectangle(0,0,size,size));
      g.SetClip(p);g.Clear(Color.FromArgb(12,21,35));
      float s=scale*size/72f;g.DrawImage(a,new RectangleF(size/2f-cx*s,size/2f-cy*s,a.Width*s,a.Height*s));
    }return b;
  }
  static void CheckSafeCircle(Bitmap b) {
    double allowed=b.Width*33.0/108+1;
    for(int y=0;y<b.Height;y++)for(int x=0;x<b.Width;x++)if(b.GetPixel(x,y).A>=16 && Math.Sqrt(Math.Pow(x+.5-b.Width/2.0,2)+Math.Pow(y+.5-b.Height/2.0,2))>allowed)throw new Exception("Visible artwork outside safe circle.");
  }
}
'@
[TvispyIconPack]::Build((Join-Path $projectRoot 'assets/branding/tvispy/foreground-source.png'), (Join-Path $projectRoot 'android/app/src/main/res'), $OutputDirectory)

