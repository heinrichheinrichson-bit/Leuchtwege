package com.heinrichheinrichson.leuchtwege;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.*;

@CapacitorPlugin(name="LeuchtwegeBackupFiles")
public class BackupFilesPlugin extends Plugin {
    private static final int LIMIT=32000000;
    @PluginMethod public void save(PluginCall call){
        String text=call.getString("text","");
        if(text.isEmpty()||text.getBytes(StandardCharsets.UTF_8).length>LIMIT){call.reject("Invalid backup size");return;}
        Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
        String name=call.getString("name","Leuchtwege.json").replaceAll("[^A-Za-z0-9._-]","_");
        intent.putExtra(Intent.EXTRA_TITLE,name);
        startActivityForResult(call,intent,"saved");
    }
    @PluginMethod public void open(PluginCall call){
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        startActivityForResult(call,intent,"opened");
    }
    private boolean cancelled(PluginCall call,ActivityResult result){
        if(call==null)return true;
        if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null||result.getData().getData()==null){JSObject r=new JSObject();r.put("cancelled",true);call.resolve(r);return true;}
        return false;
    }
    @ActivityCallback private void saved(PluginCall call,ActivityResult result){
        if(cancelled(call,result))return;
        new Thread(()->{
            try(OutputStream out=getContext().getContentResolver().openOutputStream(result.getData().getData(),"wt")){
                if(out==null)throw new IOException("No output stream");
                out.write(call.getString("text","").getBytes(StandardCharsets.UTF_8));out.flush();
            }catch(Exception e){call.reject("Could not write backup",e);return;}
            JSObject r=new JSObject();r.put("cancelled",false);call.resolve(r);
        }).start();
    }
    @ActivityCallback private void opened(PluginCall call,ActivityResult result){
        if(cancelled(call,result))return;
        new Thread(()->{
            try(InputStream in=getContext().getContentResolver().openInputStream(result.getData().getData())){
                if(in==null)throw new IOException("No input stream");
                String text=BackupFileCodec.read(in);
                JSObject r=new JSObject();r.put("cancelled",false);r.put("text",text);call.resolve(r);
            }catch(Exception e){call.reject("Could not read backup",e);}
        }).start();
    }
}
