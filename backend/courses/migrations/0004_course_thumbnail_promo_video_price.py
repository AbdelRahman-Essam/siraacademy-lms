from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0003_attachment_lesson_content_url_optional'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='thumbnail',
            field=models.ImageField(blank=True, null=True, upload_to='course_thumbnails/'),
        ),
        migrations.AddField(
            model_name='course',
            name='promo_video',
            field=models.FileField(blank=True, null=True, upload_to='course_promo_videos/',
                                    help_text='Short promotional clip shown on the public Courses catalog page'),
        ),
        migrations.AddField(
            model_name='course',
            name='price',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8,
                                       help_text="Course price. Purchases aren't wired to a payment gateway yet — "
                                                 "enrollment is admin-driven for now (see Enrollment.source)."),
        ),
    ]
