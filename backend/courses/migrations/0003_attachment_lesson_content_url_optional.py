from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0002_lesson_encryption_key_lesson_encryption_key_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lesson',
            name='content_url',
            field=models.CharField(blank=True, help_text='Path to encrypted HLS playlist', max_length=500),
        ),
        migrations.CreateModel(
            name='Attachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='lesson_attachments/%Y/%m/')),
                ('kind', models.CharField(choices=[('photo', 'Photo'), ('video', 'Video (raw, unencrypted)'), ('document', 'Document'), ('other', 'Other')], default='other', max_length=10)),
                ('original_filename', models.CharField(blank=True, max_length=255)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('lesson', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='courses.lesson')),
            ],
        ),
    ]
